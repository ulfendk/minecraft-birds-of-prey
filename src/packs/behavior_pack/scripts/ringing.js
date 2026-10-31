// Bird rings: fit a numbered ring on a bird's leg. Using a ring on a ringed bird reads
// it back: who ringed it, on which day, and how far it has moved since.
import { system, world } from '@minecraft/server';
import { birdName, consumeHeld, isBaby, NS, speciesOf, tell, tellWith } from './util.js';

const RING = `${NS}:bird_ring`;
const COUNTER = `${NS}:ring_counter`;

function fit(player, bird) {
  if (isBaby(bird)) return tell(player, 'ring.baby');
  const raw = bird.getDynamicProperty(`${NS}:ring`);
  if (raw) {
    const r = JSON.parse(raw);
    const moved = Math.round(Math.hypot(bird.location.x - r.x, bird.location.z - r.z));
    return tell(player, 'ring.info', r.id, r.by, r.day, moved);
  }
  const n = Number(world.getDynamicProperty(COUNTER) ?? 0) + 1;
  world.setDynamicProperty(COUNTER, n);
  const ring = { id: `BP ${String(n).padStart(5, '0')}`, by: player.name, day: world.getDay() + 1, x: Math.round(bird.location.x), z: Math.round(bird.location.z) };
  bird.setDynamicProperty(`${NS}:ring`, JSON.stringify(ring));
  bird.triggerEvent(`${NS}:ringed`);
  player.setDynamicProperty(`${NS}:ringed`, Number(player.getDynamicProperty(`${NS}:ringed`) ?? 0) + 1);
  consumeHeld(player);
  player.playSound('random.anvil_use', { pitch: 2, volume: 0.4 });
  tellWith(player, 'ring.ringed', [{ text: ring.id }, birdName(speciesOf(bird))]);
}

export function setupRinging() {
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.itemStack?.typeId !== RING || !event.target.typeId.startsWith(`${NS}:`)) return;
    event.cancel = true;
    const { player, target } = event;
    system.run(() => {
      if (target.isValid) fit(player, target);
    });
  });
}
