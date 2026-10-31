// Binoculars: hold them up to zoom in (camera field of view). Whatever bird you look at
// is named with its distance and goes in your Bird Guide; in a Bird Race it scores.
import { system, world } from '@minecraft/server';
import { recordSighting } from './birdguide.js';
import { onSighting } from './contest.js';
import { birdName, NS, speciesOf } from './util.js';

const watching = new Set();

function stop(player) {
  watching.delete(player.id);
  try {
    player.camera.clear();
  } catch {
    // Player left.
  }
}

function look() {
  for (const player of world.getPlayers()) {
    if (!watching.has(player.id)) continue;
    const item = player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
    if (item?.typeId !== `${NS}:binoculars`) {
      stop(player);
      continue;
    }
    let hits = [];
    try {
      hits = player.getEntitiesFromViewDirection({ maxDistance: 160, families: [NS] });
    } catch {
      continue;
    }
    const hit = hits[0];
    const id = speciesOf(hit?.entity);
    if (!id) continue;
    const dist = Math.round(hit.distance);
    player.onScreenDisplay.setActionBar({ translate: `${NS}.binoculars.sighting`, with: { rawtext: [birdName(id), { text: String(dist) }] } });
    recordSighting(player, id, dist);
    onSighting(player, id);
  }
}

export function setupBinoculars() {
  world.afterEvents.itemStartUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId !== `${NS}:binoculars`) return;
    watching.add(source.id);
    try {
      source.camera.setFov({ fov: 18, easeOptions: { easeTime: 0.25 } });
    } catch {
      // Older clients without a camera field of view still get the sightings.
    }
  });
  world.afterEvents.itemStopUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId === `${NS}:binoculars`) stop(source);
  });
  world.afterEvents.playerLeave.subscribe(({ playerId }) => watching.delete(playerId));
  system.runInterval(look, 5);
}
