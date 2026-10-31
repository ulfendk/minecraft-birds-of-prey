// The bird hide: a player standing next to one is hidden from wild birds (their
// avoid-the-player behaviour skips anyone with the birds_hidden tag).
import { system, world } from '@minecraft/server';
import { NS, say } from './util.js';

const TAG = `${NS}_hidden`;

function nearHide(player) {
  const { x, y, z } = player.location;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 1; dy++) {
        try {
          if (player.dimension.getBlock({ x: Math.floor(x) + dx, y: Math.floor(y) + dy, z: Math.floor(z) + dz })?.typeId === `${NS}:bird_hide`) return true;
        } catch {
          // Outside the world.
        }
      }
  return false;
}

export function setupHides() {
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const hidden = nearHide(player);
      if (hidden === player.hasTag(TAG)) continue;
      if (hidden) {
        player.addTag(TAG);
        say(player, 'hide.inside');
      } else player.removeTag(TAG);
    }
  }, 20);
}
