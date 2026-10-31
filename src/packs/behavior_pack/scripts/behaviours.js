// Hunting styles entity JSON alone can't express: falcons stoop from on high, ospreys
// plunge into the water, lammergeiers drop bones to crack them, scavengers gather
// where something big has died, and the secretary bird shrugs off snake venom.
import { ItemStack, system, world } from '@minecraft/server';
import { SPECIES } from './data.js';
import { pull } from './gear.js';
import { chance, distance, nearPlayers, NS, ownerId, ready, speciesOf } from './util.js';

const TICK = 10;
const PREY = ['minecraft:rabbit', 'minecraft:chicken', 'minecraft:parrot', 'minecraft:bat'];
const FISH = ['minecraft:cod', 'minecraft:salmon', 'minecraft:tropicalfish'];
const BIG = new Set(['minecraft:cow', 'minecraft:horse', 'minecraft:sheep', 'minecraft:pig', 'minecraft:goat', 'minecraft:llama', 'minecraft:camel', 'minecraft:donkey', 'minecraft:mule']);

function airborne(bird) {
  try { return !bird.isOnGround && !bird.isInWater; } catch { return false; }
}

/** Dive at something well below: a falcon's stoop or an osprey's plunge. */
function dive(bird, targets, now) {
  if (!airborne(bird) || !ready(bird, 'dive', 160, now)) return;
  const below = bird.dimension.getEntities({ location: bird.location, maxDistance: 28 })
    .filter((e) => targets.includes(e.typeId) && bird.location.y - e.location.y > 5)
    .sort((a, b) => distance(a.location, bird.location) - distance(b.location, bird.location))[0];
  if (!below) return;
  const d = distance(bird.location, below.location);
  bird.clearVelocity();
  bird.applyImpulse({ x: ((below.location.x - bird.location.x) / d) * 1.6, y: ((below.location.y - bird.location.y) / d) * 1.6, z: ((below.location.z - bird.location.z) / d) * 1.6 });
}

/** The lammergeier lets a bone fall from the sky; it shatters into bone meal. */
function dropBone(bird) {
  if (!airborne(bird) || !chance(0.01)) return;
  const dimension = bird.dimension;
  const bone = dimension.spawnItem(new ItemStack('minecraft:bone'), bird.location);
  system.runTimeout(() => {
    try {
      if (!bone.isValid) return;
      const at = bone.location;
      bone.remove();
      dimension.playSound('random.break', at, { pitch: 0.8 });
      dimension.spawnItem(new ItemStack('minecraft:bone_meal', 2), at);
    } catch {
      // Unloaded.
    }
  }, 60);
}

function tick() {
  const now = system.currentTick;
  for (const bird of nearPlayers({ families: [NS] }, 64)) {
    const s = SPECIES[speciesOf(bird)];
    if (!s || ownerId(bird)) continue;
    try {
      if (s.stoops) dive(bird, PREY, now);
      if (s.fishes && s.hovers) dive(bird, FISH, now);
      if (s.bones) dropBone(bird);
    } catch {
      // Unloaded mid-tick.
    }
  }
}

/** Scavengers circle in when a big animal dies in the open. */
function onDeath({ deadEntity }) {
  if (!BIG.has(deadEntity.typeId)) return;
  let at;
  try { at = deadEntity.location; } catch { return; }
  const above = { x: at.x, y: at.y + 10, z: at.z };
  for (const bird of deadEntity.dimension.getEntities({ families: [NS], location: at, maxDistance: 96 })) {
    if (SPECIES[speciesOf(bird)]?.scavenger && !ownerId(bird)) pull(bird, above, 200);
  }
}

export function setupBehaviours() {
  system.runInterval(tick, TICK);
  world.afterEvents.entityDie.subscribe(onDeath);
  // A snake's bite can't get through the secretary bird's leg scales.
  world.afterEvents.effectAdd.subscribe(({ entity, effect }) => {
    if (!effect.typeId.endsWith('poison') || !SPECIES[speciesOf(entity)]?.venomProof) return;
    system.run(() => {
      try { entity.removeEffect('poison'); } catch { /* gone */ }
    });
  });
}
