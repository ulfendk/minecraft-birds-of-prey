// Generates the behavior pack and resource pack into build/.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { animationFile } from '../src/lib/anim.mjs';
import { buildEntity, buildLoot, buildSpawnRules } from '../src/lib/behavior.mjs';
import { buildAnimationControllers, buildClientEntity, buildEntitySounds, buildRenderController } from '../src/lib/client.mjs';
import { MIN_ENGINE, NS, PACK_NAME, SCRIPT_SERVER_VERSION, SCRIPT_UI_VERSION } from '../src/lib/constants.mjs';
import { packIcon } from '../src/lib/icon.mjs';
import { langEntries, LOCALES } from '../src/lang.mjs';
import { guideEntry } from '../src/lib/info.mjs';
import { render } from './render.mjs';
import { buildJava } from './java.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { paintTexture } from '../src/lib/texture.mjs';
import { buildItem, items, recipes } from '../src/items.mjs';
import { blockRecipes, blocks } from '../src/blocks.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'build');
const BP = join(OUT, 'behavior_pack');
const RP = join(OUT, 'resource_pack');

const UUID = {
  bpHeader: '3f6c2a8e-5d41-4b7a-9e0c-7a1d2b4c6e81',
  bpData: '8b2e4f10-6c3a-4d59-a1e7-2f9c5b3d7a04',
  bpScript: 'c51d7e92-0a4b-4f68-b3c2-9e6a1d8f2b37',
  rpHeader: 'e7a94c3b-2f15-4d8e-8b60-5c1f3a9d7e22',
  rpResources: '1d4b8e6f-9a27-4c3e-b5d1-6f0e2a8c4b93',
};

/** Bones that only show in some situations (the hood, the catch), hidden in portraits. */
export const HIDDEN = new Set(['hood', 'prey']);

const textureCache = new WeakMap();
async function paintTextureCached(geo, a) {
  if (!textureCache.has(a)) textureCache.set(a, paintTexture(geo, a.materials));
  return textureCache.get(a);
}

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

export async function loadAnimals() {
  const dir = join(ROOT, 'src', 'animals');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mjs')).sort();
  const animals = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const a = mod.default;
    if (!a.model.bones.some((b) => b.name === 'root')) throw new Error(`${a.id}: the model needs a root bone`);
    if (!a.group) throw new Error(`${a.id}: no Bird Guide group`);
    animals.push(a);
  }
  linkFoodWeb(animals);
  return animals;
}

/** Prey automatically flees from every species that hunts it. */
/** Bird Race points for spotting a species: the rarer it spawns, the more it's worth. */
export function racePoints(a) {
  const weight = (a.spawn ?? []).reduce((sum, s) => sum + (s.weight ?? 3), 0);
  return Math.max(1, 6 - weight);
}

function linkFoodWeb(animals) {
  for (const prey of animals) {
    const families = new Set([prey.id, ...(prey.family ?? [])]);
    const hunters = animals.filter((p) => p !== prey && (p.hunts ?? []).some((h) => families.has(h)));
    prey.fleesFrom = [...new Set([...(prey.fleesFrom ?? []), ...hunters.map((h) => h.id)])];
  }
}

function manifests(version) {
  const v = version.split('.').map(Number);
  const bp = {
    format_version: 2,
    header: {
      name: `${PACK_NAME} v${version} (Behavior)`,
      description: 'pack.description',
      uuid: UUID.bpHeader,
      version: v,
      min_engine_version: MIN_ENGINE,
    },
    modules: [
      { type: 'data', uuid: UUID.bpData, version: v },
      { type: 'script', language: 'javascript', uuid: UUID.bpScript, version: v, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: UUID.rpHeader, version: v },
      { module_name: '@minecraft/server', version: SCRIPT_SERVER_VERSION },
      { module_name: '@minecraft/server-ui', version: SCRIPT_UI_VERSION },
    ],
    metadata: { authors: [`${PACK_NAME} contributors`], license: 'MIT' },
  };
  const rp = {
    format_version: 2,
    header: {
      name: `${PACK_NAME} v${version} (Resources)`,
      description: 'pack.description',
      uuid: UUID.rpHeader,
      version: v,
      min_engine_version: MIN_ENGINE,
    },
    modules: [{ type: 'resources', uuid: UUID.rpResources, version: v }],
    dependencies: [{ uuid: UUID.bpHeader, version: v }],
    metadata: { authors: [`${PACK_NAME} contributors`], license: 'MIT' },
  };
  return { bp, rp };
}

export async function build({ quiet = false } = {}) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  await rm(BP, { recursive: true, force: true });
  await rm(RP, { recursive: true, force: true });

  // Hand-written files first; generated files may add to the same folders.
  await cp(join(ROOT, 'src', 'packs', 'behavior_pack'), BP, { recursive: true });
  await cp(join(ROOT, 'src', 'packs', 'resource_pack'), RP, { recursive: true });

  const { bp, rp } = manifests(pkg.version);
  await write(join(BP, 'manifest.json'), bp);
  await write(join(RP, 'manifest.json'), rp);
  const icon = packIcon();
  await write(join(BP, 'pack_icon.png'), icon);
  await write(join(RP, 'pack_icon.png'), icon);

  const animals = await loadAnimals();
  const java = { geos: {}, anims: {}, textures: {}, langs: {} };
  const entitySounds = {};
  const report = [];

  for (const a of animals) {
    // Behavior
    await write(join(BP, 'entities', `${a.id}.json`), buildEntity(a));
    await write(join(BP, 'spawn_rules', `${a.id}.json`), buildSpawnRules(a));
    await write(join(BP, 'loot_tables', 'entities', `${NS}_${a.id}.json`), buildLoot(a));

    // Model + texture
    const geo = buildGeometry(`geometry.${NS}.${a.id}`, a.model);
    const texture = await paintTextureCached(geo, a);
    await write(join(RP, 'models', 'entity', `${a.id}.geo.json`), geo.geometry);
    await write(join(RP, 'textures', 'entity', NS, `${a.id}.png`), texture);
    java.geos[a.id] = geo.geometry;
    java.textures[a.id] = texture;

    // Animation
    const animNames = Object.keys(a.anims);
    const anims = animationFile(a.id, a.anims, NS);
    await write(join(RP, 'animations', `${a.id}.animation.json`), anims);
    java.anims[a.id] = anims;
    await write(join(RP, 'animation_controllers', `${a.id}.animation_controllers.json`), buildAnimationControllers(a, animNames));
    await write(join(RP, 'entity', `${a.id}.entity.json`), buildClientEntity(a, animNames));
    const boneNames = a.model.bones.map((b) => b.name);
    await write(join(RP, 'render_controllers', `${a.id}.render_controllers.json`), buildRenderController(a, boneNames));

    // Portrait for the Bird Guide.
    await write(join(RP, 'textures', 'ui', NS, `${a.id}.png`), render(geo.geometry, texture, { yaw: 35, size: 64, hidden: HIDDEN }));

    entitySounds[`${NS}:${a.id}`] = buildEntitySounds(a);
    report.push(`${a.id} (${geo.width}x${geo.height})`);
  }

  // Bird data for the scripts (Bird Guide, falconry, behaviours).
  const data = animals.map(guideEntry);
  const species = Object.fromEntries(animals.map((a) => [a.id, {
    falconry: !!a.falconry, stoops: !!a.stoops, hovers: !!a.hovers, soars: !!a.soars, owl: a.group === 'owl',
    walks: a.movement === 'walk', fishes: (a.hunts ?? []).includes('fish'), scavenger: !!a.scavenger, bones: !!a.dropsBones,
    nests: !!a.nestBox, venomProof: !!a.venomProof, call: a.sounds?.ambient ?? null, pitch: a.sounds?.pitch?.[0] ?? 1, racePoints: racePoints(a),
  }]));
  const itemIds = [...items.map((i) => `${NS}:${i.id}`), ...blocks.map((b) => `${NS}:${b.id}`)];
  await write(join(BP, 'scripts', 'data.js'), [
    '// Generated by tools/build.mjs',
    `export const ANIMALS = ${JSON.stringify(data, null, 2)};`,
    `export const SPECIES = ${JSON.stringify(species)};`,
    `export const ITEMS = ${JSON.stringify(itemIds)};`,
    '',
  ].join('\n'));

  // Items
  const itemTextures = {};
  for (const item of items) {
    await write(join(BP, 'items', `${item.id}.json`), buildItem(item));
    await write(join(RP, 'textures', 'items', NS, `${item.id}.png`), item.icon);
    itemTextures[`${NS}_${item.id}`] = { textures: `textures/items/${NS}/${item.id}` };
  }
  // Blocks
  const terrain = {};
  const blockSounds = { format_version: [1, 1, 0] };
  for (const block of blocks) {
    await write(join(BP, 'blocks', `${block.id}.json`), block.definition);
    await write(join(RP, 'models', 'blocks', `${block.id}.geo.json`), block.geometry);
    await write(join(RP, 'textures', 'blocks', NS, `${block.id}.png`), block.texture);
    terrain[`${NS}_${block.id}`] = { textures: `textures/blocks/${NS}/${block.id}` };
    for (const [face, tex] of Object.entries(block.faces ?? {})) {
      await write(join(RP, 'textures', 'blocks', NS, `${block.id}_${face}.png`), tex);
      terrain[`${NS}_${block.id}_${face}`] = { textures: `textures/blocks/${NS}/${block.id}_${face}` };
    }
    blockSounds[`${NS}:${block.id}`] = { sound: block.sound ?? 'stone' };
  }
  await write(join(RP, 'textures', 'terrain_texture.json'), {
    resource_pack_name: NS, texture_name: 'atlas.terrain', padding: 8, num_mip_levels: 4, texture_data: terrain,
  });
  await write(join(RP, 'blocks.json'), blockSounds);

  for (const recipe of [...recipes, ...blockRecipes]) {
    const body = Object.values(recipe)[0];
    const name = body.description.identifier.split(':')[1];
    await write(join(BP, 'recipes', `${name}.json`), { format_version: '1.12', ...recipe });
  }
  await write(join(RP, 'textures', 'item_texture.json'), {
    resource_pack_name: NS,
    texture_name: 'atlas.items',
    texture_data: itemTextures,
  });

  // Sounds: entity events point at vanilla sound definitions.
  await write(join(RP, 'sounds.json'), { entity_sounds: { entities: entitySounds } });

  // Language
  for (const locale of LOCALES) {
    const entries = langEntries(locale, {
      animals, items, blocks, description: pkg.description, version: pkg.version,
    });
    java.langs[locale] = entries;
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    for (const pack of [BP, RP]) await write(join(pack, 'texts', `${locale}.lang`), text);
  }
  for (const pack of [BP, RP]) await write(join(pack, 'texts', 'languages.json'), LOCALES);

  // Java edition resources
  const speciesCount = await buildJava({
    animals, ...java, items, blocks, recipes: [...recipes, ...blockRecipes], icon,
    OUT: join(ROOT, 'java', 'src', 'generated', 'resources'),
  });

  if (!quiet) console.log(`Java: ${speciesCount} species written to java/src/generated/resources`);
  if (!quiet) console.log(`Built ${animals.length} birds: ${report.join(', ')}\nItems: ${items.map((i) => i.id).join(', ')}`);
  return { animals, version: pkg.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
