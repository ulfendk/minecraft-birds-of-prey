// Small gear: the bird call brings wild raptors over to look, and owl pellets can be
// pulled apart for the bones of the owl's prey.
import { system, world } from '@minecraft/server';
import { chance, consumeHeld, distance, give, NS, ownerId, say, stack } from './util.js';

/** Steer a flying bird towards a point for a couple of seconds. */
export function pull(bird, target, ticks = 60) {
  const run = system.runInterval(() => {
    try {
      if (!bird.isValid || distance(bird.location, target) < 4) return system.clearRun(run);
      const d = distance(bird.location, target);
      bird.applyImpulse({ x: ((target.x - bird.location.x) / d) * 0.12, y: ((target.y - bird.location.y) / d) * 0.12, z: ((target.z - bird.location.z) / d) * 0.12 });
    } catch {
      system.clearRun(run);
    }
  }, 5);
  system.runTimeout(() => system.clearRun(run), ticks);
}

function call(player) {
  player.dimension.playSound('mob.phantom.idle', player.location, { pitch: 1.8, volume: 2 });
  say(player, 'call.used');
  const above = { x: player.location.x, y: player.location.y + 8, z: player.location.z };
  for (const bird of player.dimension.getEntities({ families: [NS], location: player.location, maxDistance: 64 })) {
    if (!ownerId(bird)) pull(bird, above, 100);
  }
}

function dissect(player) {
  consumeHeld(player);
  player.playSound('mob.fox.eat');
  give(player, stack('minecraft:bone_meal', 1 + Math.floor(Math.random() * 3)));
  if (chance(0.4)) give(player, stack('minecraft:bone'));
  if (chance(0.05)) give(player, stack('minecraft:rabbit_foot'));
  say(player, 'pellet.dissected');
}

export function setupGear() {
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId === `${NS}:bird_call`) call(source);
    else if (itemStack?.typeId === `${NS}:owl_pellet`) system.run(() => dissect(source));
  });
}
