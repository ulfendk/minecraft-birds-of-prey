// Falconry: tame a bird with raw meat, carry it on the falconer's glove, fly it at
// what you're looking at, and it brings back the catch. The lure calls your birds
// home, the hood calms one down.
//
// A bird on the glove isn't an entity: the glove item holds it (species, name, ring,
// health) and releasing it spawns it again, trained to you.
import { system, world } from '@minecraft/server';
import { SPECIES } from './data.js';
import { onCatch } from './contest.js';
import { birdName, distance, give, held, NS, ownerId, say, sayWith, setHeld, speciesOf, stack } from './util.js';

const GLOVE = `${NS}:falconer_glove`;
const LADEN = `${NS}:glove_with_bird`;
const HOOD = `${NS}:falconry_hood`;
const LURE = `${NS}:falconry_lure`;
const QUARRY = `${NS}_quarry`;
const MEAT = new Set(['rabbit', 'chicken', 'beef', 'mutton', 'porkchop'].map((m) => `minecraft:${m}`));

/** Tagged quarry: entity id -> { entity, until }. */
const quarries = new Map();
/** Birds bringing back a catch: bird id -> { bird, owner, items, until }. */
const carrying = new Map();

const isFalconryBird = (e) => !!SPECIES[speciesOf(e)]?.falconry;

function setOwner(bird, player) {
  bird.setDynamicProperty(`${NS}:owner`, player.id);
}

/** Wild bird fed raw meat: once it's tamed, remember whose it is and say so. */
function checkTamed(player, bird) {
  system.runTimeout(() => {
    try {
      if (!bird.isValid || bird.getDynamicProperty(`${NS}:owner`)) return;
      if (!bird.getComponent('minecraft:is_tamed')) return;
      setOwner(bird, player);
      sayWith(player, 'falconry.tamed', [birdName(speciesOf(bird))]);
    } catch {
      // Bird or player gone.
    }
  }, 2);
}

/** Step onto the glove: the bird becomes part of the item. */
function pickUp(player, bird) {
  const id = speciesOf(bird);
  const data = {
    id,
    name: bird.nameTag || '',
    ring: bird.getDynamicProperty(`${NS}:ring`) ?? null,
    health: bird.getComponent('minecraft:health')?.currentValue ?? null,
    hooded: !!bird.getProperty(`${NS}:hooded`),
  };
  const glove = stack(LADEN);
  glove.setDynamicProperty(`${NS}:bird`, JSON.stringify(data));
  glove.setLore([`§7${data.name || id.replace(/_/g, ' ')}`]);
  setHeld(player, glove);
  deliver(bird, player);
  bird.remove();
  player.playSound('mob.parrot.fly', { pitch: 0.8 });
  sayWith(player, 'falconry.on_glove', [data.name ? { text: data.name } : birdName(id)]);
}

/** The first living thing (not you, not your own birds) along the falconer's line of sight. */
function quarryInSight(player) {
  let hits = [];
  try {
    hits = player.getEntitiesFromViewDirection({ maxDistance: 64 });
  } catch {
    return undefined;
  }
  for (const { entity } of hits) {
    if (entity.typeId === 'minecraft:player' || entity.typeId === 'minecraft:item') continue;
    if (!entity.getComponent('minecraft:health')) continue;
    if (ownerId(entity) === player.id) continue;
    return entity;
  }
  return undefined;
}

/** Cast the bird off the glove, at the quarry if there is one. */
function release(player, glove) {
  let data;
  try {
    data = JSON.parse(glove.getDynamicProperty(`${NS}:bird`) ?? 'null');
  } catch {
    data = null;
  }
  setHeld(player, stack(GLOVE));
  if (!data?.id || !SPECIES[data.id]) return;

  const view = player.getViewDirection();
  const at = { x: player.location.x + view.x, y: player.location.y + 1.6, z: player.location.z + view.z };
  const bird = player.dimension.spawnEntity(`${NS}:${data.id}<${NS}:spawn_tame>`, at);
  try {
    bird.getComponent('minecraft:tameable')?.tame(player);
  } catch {
    // Tamed by the event below instead.
  }
  if (!bird.getComponent('minecraft:is_tamed')) bird.triggerEvent(`${NS}:on_tame`);
  setOwner(bird, player);
  if (data.name) bird.nameTag = data.name;
  if (data.ring) {
    bird.setDynamicProperty(`${NS}:ring`, data.ring);
    bird.triggerEvent(`${NS}:ringed`);
  }
  if (data.health) bird.getComponent('minecraft:health')?.setCurrentValue(data.health);
  player.playSound('mob.parrot.fly', { pitch: 1.2 });

  const target = quarryInSight(player);
  const name = data.name ? { text: data.name } : birdName(data.id);
  if (target) {
    target.addTag(QUARRY);
    quarries.set(target.id, { entity: target, until: system.currentTick + 600 });
    const d = distance(at, target.location) || 1;
    bird.applyImpulse({ x: (target.location.x - at.x) / d, y: (target.location.y - at.y) / d + 0.2, z: (target.location.z - at.z) / d });
    sayWith(player, 'falconry.released', [name]);
  } else {
    bird.applyImpulse({ x: view.x * 0.5, y: 0.8, z: view.z * 0.5 });
    sayWith(player, 'falconry.circling', [name]);
  }
}

/** A trained bird's kill: count it, pick up the catch to bring home. */
function onKill(bird, dead, deathLocation) {
  const owner = ownerId(bird);
  if (!owner) return;
  quarries.delete(dead.id);
  const player = world.getPlayers().find((p) => p.id === owner);
  if (player) {
    onCatch(player, dead.typeId, dead);
    sayWith(player, 'falconry.caught', [bird.nameTag ? { text: bird.nameTag } : birdName(speciesOf(bird))]);
  }
  const dimension = bird.dimension;
  system.runTimeout(() => {
    try {
      const items = [];
      for (const e of dimension.getEntities({ type: 'minecraft:item', location: deathLocation, maxDistance: 2.5 })) {
        const item = e.getComponent('minecraft:item')?.itemStack;
        if (item) items.push(item);
        e.remove();
      }
      if (!bird.isValid) return;
      bird.triggerEvent(`${NS}:start_carrying`);
      const prev = carrying.get(bird.id);
      carrying.set(bird.id, { bird, owner, items: [...(prev?.items ?? []), ...items], until: system.currentTick + 1200 });
    } catch {
      // Unloaded.
    }
  }, 2);
}

/** Hand the catch to the falconer (or drop it if they never come). */
function deliver(bird, player) {
  const c = carrying.get(bird.id);
  if (!c) return;
  carrying.delete(bird.id);
  try {
    bird.triggerEvent(`${NS}:stop_carrying`);
  } catch {
    // Gone.
  }
  if (player) {
    for (const item of c.items) give(player, item);
    if (c.items.length) sayWith(player, 'falconry.returned', [bird.nameTag ? { text: bird.nameTag } : birdName(speciesOf(bird))]);
  } else {
    for (const item of c.items) bird.dimension.spawnItem(item, bird.location);
  }
}

function tick() {
  const now = system.currentTick;
  for (const [id, q] of quarries) {
    if (now < q.until && q.entity.isValid) continue;
    try { q.entity.removeTag(QUARRY); } catch { /* gone */ }
    quarries.delete(id);
  }
  for (const [id, c] of carrying) {
    if (!c.bird.isValid) {
      carrying.delete(id);
      continue;
    }
    const player = world.getPlayers().find((p) => p.id === c.owner);
    if (player && player.dimension.id === c.bird.dimension.id && distance(player.location, c.bird.location) < 4) deliver(c.bird, player);
    else if (now > c.until) deliver(c.bird, undefined);
  }
}

/** The lure brings every bird of yours back. */
function recall(player) {
  player.playSound('mob.parrot.fly', { pitch: 0.6 });
  say(player, 'falconry.recall');
  for (const bird of player.dimension.getEntities({ families: [NS], location: player.location, maxDistance: 160 })) {
    if (ownerId(bird) !== player.id) continue;
    if (distance(bird.location, player.location) > 24) {
      bird.teleport({ x: player.location.x, y: player.location.y + 6, z: player.location.z });
    } else {
      const d = distance(bird.location, player.location) || 1;
      bird.applyImpulse({ x: (player.location.x - bird.location.x) / d, y: 0.3, z: (player.location.z - bird.location.z) / d });
    }
  }
  for (const [id, q] of quarries) {
    try { q.entity.removeTag(QUARRY); } catch { /* gone */ }
    quarries.delete(id);
  }
}

export function setupFalconry() {
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target, itemStack } = event;
    if (!target.typeId.startsWith(`${NS}:`)) return;
    const item = itemStack?.typeId;
    const mine = ownerId(target) === player.id;
    if (item === GLOVE && isFalconryBird(target)) {
      event.cancel = true;
      system.run(() => {
        if (!target.isValid) return;
        if (!target.getComponent('minecraft:is_tamed')) return;
        if (ownerId(target) !== player.id) return say(player, 'falconry.not_yours');
        pickUp(player, target);
      });
    } else if (item === HOOD && mine) {
      event.cancel = true;
      system.run(() => {
        const hooded = !!target.getProperty(`${NS}:hooded`);
        target.triggerEvent(hooded ? `${NS}:unhood` : `${NS}:hood`);
        player.playSound('armor.equip_leather');
        say(player, hooded ? 'falconry.unhooded' : 'falconry.hooded');
      });
    } else if (MEAT.has(item) && isFalconryBird(target) && !target.getComponent('minecraft:is_tamed')) {
      checkTamed(player, target);
    }
  });

  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId === LADEN) system.run(() => {
      const glove = held(source);
      if (glove?.typeId === LADEN) release(source, glove);
    });
    else if (itemStack?.typeId === LURE) recall(source);
  });

  world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
    const killer = damageSource?.damagingEntity;
    if (!killer?.typeId?.startsWith(`${NS}:`)) return;
    let at;
    try { at = deadEntity.location; } catch { return; }
    onKill(killer, deadEntity, at);
  });

  system.runInterval(tick, 10);
}
