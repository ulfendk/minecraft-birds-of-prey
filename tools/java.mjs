// Generates the Java edition's resources (java/src/generated/resources) from the
// same specs as the Bedrock packs. GeckoLib reads the Bedrock geometry and
// animation formats directly, so models and animations are shared as-is.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NS } from '../src/lib/constants.mjs';
import { racePoints } from './build.mjs';
import { hitbox } from '../src/lib/behavior.mjs';
import { eggIcon } from '../src/lib/texture.mjs';

const BEDROCK_TO_JAVA_SOUNDS = {
  'mob.phantom.idle': 'entity.phantom.ambient', 'mob.phantom.flap': 'entity.phantom.flap', 'mob.phantom.swoop': 'entity.phantom.swoop',
  'mob.parrot.idle': 'entity.parrot.ambient', 'mob.parrot.hurt': 'entity.parrot.hurt', 'mob.parrot.death': 'entity.parrot.death',
  'mob.parrot.fly': 'entity.parrot.fly',
  'mob.fox.screech': 'entity.fox.screech', 'mob.fox.hurt': 'entity.fox.hurt', 'mob.fox.death': 'entity.fox.death',
  'note.flute': 'block.note_block.flute', 'note.didgeridoo': 'block.note_block.didgeridoo',
  'mob.cat.hiss': 'entity.cat.hiss', 'mob.frog.ambient': 'entity.frog.ambient',
  'mob.chicken.hurt': 'entity.chicken.hurt', 'mob.bat.hurt': 'entity.bat.hurt', 'mob.bat.death': 'entity.bat.death',
  'mob.goat.ambient': 'entity.goat.ambient',
};
/** Bedrock families of vanilla prey -> Java entity ids (plus our neighbours' mods when they are installed). */
const FAMILY_TO_JAVA = {
  rabbit: ['minecraft:rabbit'], chicken: ['minecraft:chicken'], parrot: ['minecraft:parrot'], bat: ['minecraft:bat'],
  silverfish: ['minecraft:silverfish'], frog: ['minecraft:frog'], fox: ['minecraft:fox'], fish: ['minecraft:cod', 'minecraft:salmon', 'minecraft:tropical_fish'],
  small: ['safari:meerkat', 'safari:chameleon'], venomous_snake: ['safari:king_cobra', 'safari:black_mamba'],
};
const ITEM_RENAMES = {};

const javaItem = (id) => {
  const [ns, name] = id.includes(':') ? id.split(':') : ['minecraft', id];
  return `${ns}:${ITEM_RENAMES[name] ?? name}`;
};
const javaSound = (s) => {
  if (!s) return null;
  const j = BEDROCK_TO_JAVA_SOUNDS[s];
  if (!j) throw new Error(`No Java sound mapped for Bedrock sound "${s}" (tools/java.mjs)`);
  return `minecraft:${j}`;
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

/** Turn the Bedrock-style hunting/flee families into concrete entity ids. */
function resolveTargets(families, animals) {
  const out = new Set();
  for (const f of families ?? []) {
    for (const a of animals) if (a.id === f || (a.family ?? []).includes(f)) out.add(`${NS}:${a.id}`);
    for (const id of FAMILY_TO_JAVA[f] ?? []) out.add(id);
  }
  return [...out];
}

/** Species data read by the Java mod at startup (dk.ulfen.birds.species.Species). */
function speciesRecord(a, animals, animNames) {
  const s = a.sounds ?? {};
  return {
    id: a.id,
    group: a.group,
    width: Math.round(a.size[0] * 1000) / 1000,
    height: a.size[1],
    health: a.health,
    speed: a.speed,
    flySpeed: a.flySpeed ?? 0.2,
    attackDamage: a.attack.damage,
    hunts: resolveTargets(a.hunts, animals),
    huntRange: a.huntRange ?? 24,
    shy: a.shy ?? 10,
    alertsPack: !!a.alertsPack,
    sleeps: a.sleeps ?? 'night',
    walks: a.movement === 'walk',
    falconry: !!a.falconry,
    tameChance: a.falconry?.chance ?? 0.25,
    stoops: !!a.stoops,
    hovers: !!a.hovers,
    soars: !!a.soars,
    pellets: !!a.pellets,
    scavenger: !!a.scavenger,
    dropsBones: !!a.dropsBones,
    nestBox: !!a.nestBox,
    venomProof: !!a.venomProof,
    scale: a.scale ?? 1,
    racePoints: racePoints(a),
    sounds: {
      ambient: javaSound(s.ambient), hurt: javaSound(s.hurt), death: javaSound(s.death),
      pitchMin: (s.pitch ?? [1, 1])[0], pitchMax: (s.pitch ?? [1, 1])[1], interval: s.interval ?? 12,
    },
    animations: animNames,
    spawns: (a.spawn ?? []).map((sp) => ({ biomes: sp.biomes, weight: sp.weight ?? 3, min: sp.group?.[0] ?? 1, max: sp.group?.[1] ?? 1 })),
    egg: a.egg,
  };
}

function lootTable(a) {
  return {
    type: 'minecraft:entity',
    pools: (a.loot ?? [{ item: 'feather', min: 1, max: 3 }]).map((l) => ({
      rolls: 1,
      ...(l.chance ? { conditions: [{ condition: 'minecraft:random_chance', chance: l.chance }] } : {}),
      entries: [{
        type: 'minecraft:item',
        name: javaItem(l.item),
        functions: [
          { function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: l.min ?? 0, max: l.max ?? 1 } },
          ...(l.smelts ? [{ function: 'minecraft:furnace_smelt', conditions: [{ condition: 'minecraft:entity_properties', entity: 'this', predicate: { flags: { is_on_fire: true } } }] }] : []),
          { function: 'minecraft:enchanted_count_increase', enchantment: 'minecraft:looting', count: { type: 'minecraft:uniform', min: 0, max: 1 } },
        ],
      }],
    })),
  };
}

/** Bedrock recipe -> Java recipe (one or more files). */
function javaRecipes(recipe) {
  const [type, body] = Object.entries(recipe)[0];
  const name = body.description.identifier.split(':')[1];
  const result = (r) => ({ id: javaItem(r.item), count: r.count ?? 1 });
  if (type === 'minecraft:recipe_shaped') {
    return [[name, {
      type: 'minecraft:crafting_shaped',
      category: 'misc',
      pattern: body.pattern,
      key: Object.fromEntries(Object.entries(body.key).map(([k, v]) => [k, javaItem(v.item)])),
      result: result(body.result),
    }]];
  }
  if (type === 'minecraft:recipe_shapeless') {
    return [[name, {
      type: 'minecraft:crafting_shapeless',
      category: 'misc',
      ingredients: body.ingredients.flatMap((i) => Array.from({ length: i.count ?? 1 }, () => javaItem(i.item))),
      result: result(body.result),
    }]];
  }
  if (type === 'minecraft:recipe_furnace') {
    const base = { ingredient: javaItem(body.input), result: { id: javaItem(body.output) } };
    return [
      [name, { type: 'minecraft:smelting', category: 'food', ...base, experience: 0.35, cookingtime: 200 }],
      [`${name}_from_smoking`, { type: 'minecraft:smoking', category: 'food', ...base, experience: 0.35, cookingtime: 100 }],
      [`${name}_from_campfire`, { type: 'minecraft:campfire_cooking', category: 'food', ...base, experience: 0.35, cookingtime: 600 }],
    ];
  }
  throw new Error(`Unknown recipe type ${type}`);
}

/** Bedrock block geometry (per-face UV boxes and planes) -> Java block model elements. */
function blockModel(block) {
  const elements = [];
  for (const bone of block.geometry['minecraft:geometry'][0].bones) {
    for (const cube of bone.cubes) {
      const from = [cube.origin[0] + 8, cube.origin[1], cube.origin[2] + 8];
      const to = from.map((v, i) => v + cube.size[i]);
      const faces = {};
      const all = { north: 'north', south: 'south', east: 'east', west: 'west', up: 'up', down: 'down' };
      for (const [f, uv] of Object.entries(cube.uv)) faces[all[f]] = { uv: [0, 0, 16, 16], texture: uv.material_instance ? `#${uv.material_instance}` : block.faces?.[f] ? `#${f}` : '#all' };
      const el = { from, to, faces };
      if (cube.rotation) {
        const axis = cube.rotation[1] ? 'y' : cube.rotation[0] ? 'x' : 'z';
        el.rotation = { origin: [8, 0, 8], axis, angle: cube.rotation[{ x: 0, y: 1, z: 2 }[axis]] };
      }
      elements.push(el);
    }
  }
  const textures = { all: `${NS}:block/${block.id}`, particle: `${NS}:block/${block.id}` };
  for (const f of Object.keys(block.faces ?? {})) textures[f] = `${NS}:block/${block.id}_${f}`;
  return { textures, elements };
}

export async function buildJava({ animals, geos, anims, textures, items, blocks, recipes, langs, icon, OUT }) {
  const R = OUT;
  await rm(R, { recursive: true, force: true });
  const A = join(R, 'assets', NS);
  const D = join(R, 'data', NS);

  const species = [];
  for (const a of animals) {
    await write(join(A, 'geckolib', 'models', 'entity', `${a.id}.geo.json`), geos[a.id]);
    await write(join(A, 'geckolib', 'animations', 'entity', `${a.id}.animation.json`), anims[a.id]);
    await write(join(A, 'textures', 'entity', `${a.id}.png`), textures[a.id]);
    await write(join(A, 'textures', 'item', `${a.id}_spawn_egg.png`), eggIcon(a.egg[0], a.egg[1], a.id.length));
    await itemModel(A, `${a.id}_spawn_egg`, 'minecraft:item/generated');
    await write(join(D, 'loot_table', 'entities', `${a.id}.json`), lootTable(a));
    species.push(speciesRecord(a, animals, Object.keys(a.anims)));
  }
  await write(join(D, 'species.json'), species);

  for (const item of items) {
    await write(join(A, 'textures', 'item', `${item.id}.png`), item.icon);
    await itemModel(A, item.id, 'minecraft:item/generated');
  }

  for (const block of blocks) {
    await write(join(A, 'textures', 'block', `${block.id}.png`), block.texture);
    for (const [f, tex] of Object.entries(block.faces ?? {})) await write(join(A, 'textures', 'block', `${block.id}_${f}.png`), tex);
    await write(join(A, 'models', 'block', `${block.id}.json`), blockModel(block));
    // Every block turns to face the player who placed them.
    await write(join(A, 'blockstates', `${block.id}.json`), { variants: Object.fromEntries(
      [['north', 0], ['east', 90], ['south', 180], ['west', 270]].map(([f, y]) => [`facing=${f}`, { model: `${NS}:block/${block.id}`, ...(y ? { y } : {}) }]),
    ) });
    await write(join(A, 'models', 'item', `${block.id}.json`), { parent: `${NS}:block/${block.id}` });
    await write(join(A, 'items', `${block.id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${block.id}` } });
    await write(join(D, 'loot_table', 'blocks', `${block.id}.json`), {
      type: 'minecraft:block',
      pools: [{ rolls: 1, entries: [{ type: 'minecraft:item', name: `${NS}:${block.id}` }], conditions: [{ condition: 'minecraft:survives_explosion' }] }],
    });
  }

  for (const recipe of recipes) for (const [name, body] of javaRecipes(recipe)) await write(join(D, 'recipe', `${name}.json`), body);

  // Language files: Bedrock keys -> Java keys.
  for (const [locale, entries] of Object.entries(langs)) {
    const out = {};
    for (const [k, v] of entries) {
      let m;
      if ((m = k.match(new RegExp(`^entity\\.${NS}:(.+)\\.name$`)))) out[`entity.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^item\\.spawn_egg\\.entity\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}_spawn_egg`] = v;
      else if ((m = k.match(new RegExp(`^item\\.${NS}:(.+)\\.name$`)))) out[`item.${NS}.${m[1]}`] = v;
      else if ((m = k.match(new RegExp(`^tile\\.${NS}:(.+)\\.name$`)))) out[`block.${NS}.${m[1]}`] = v;
      else if (k.startsWith(`${NS}.`)) out[k] = v;
    }
    out[`itemGroup.${NS}`] = locale === 'da_DK' ? 'Rovfugle' : 'Birds of Prey';
    await write(join(A, 'lang', `${locale.toLowerCase()}.json`), out);
  }

  await write(join(A, 'icon.png'), icon);
  return species.length;
}

async function itemModel(A, id, parent) {
  await write(join(A, 'models', 'item', `${id}.json`), { parent, textures: { layer0: `${NS}:item/${id}` } });
  await write(join(A, 'items', `${id}.json`), { model: { type: 'minecraft:model', model: `${NS}:item/${id}` } });
}
