import { ItemStack, system, world } from '@minecraft/server';
import { catchPoints } from './contest.js';
import { ITEMS } from './data.js';

/**
 * Used by tools/bds-test.sh: reports how many of each bird exist and which expected
 * ones are missing. Message = space-separated expected ids.
 */
export function selfTest(message) {
  const expected = message.split(/\s+/).filter(Boolean);
  const dim = world.getDimension('overworld');
  const counts = {};
  for (const e of dim.getEntities()) {
    if (e.typeId.startsWith('birds:')) counts[e.typeId] = (counts[e.typeId] ?? 0) + 1;
  }
  const missing = expected.filter((id) => !counts[`birds:${id}`]);
  // Every custom item and block must exist as an item.
  for (const id of ITEMS) {
    try {
      new ItemStack(id, 1);
    } catch {
      missing.push(id);
    }
  }
  // A glove can hold a bird.
  try {
    const glove = new ItemStack('birds:glove_with_bird');
    glove.setDynamicProperty('birds:bird', '{"id":"kestrel"}');
    if (glove.getDynamicProperty('birds:bird') !== '{"id":"kestrel"}') missing.push('glove data');
  } catch {
    missing.push('glove data');
  }
  if (catchPoints('minecraft:fox') !== 5 || catchPoints('minecraft:zombie', ['monster']) !== 4) missing.push('contest points');

  // Hooding and carrying are entity properties the scripts flip with events.
  const kestrel = dim.getEntities({ type: 'birds:kestrel' })[0];
  if (kestrel) {
    kestrel.triggerEvent('birds:on_tame');
    kestrel.triggerEvent('birds:hood');
    kestrel.triggerEvent('birds:start_carrying');
  }
  system.runTimeout(() => {
    try {
      if (!kestrel?.getComponent('minecraft:is_tamed')) missing.push('tame event');
      if (kestrel?.getProperty('birds:hooded') !== true) missing.push('hood');
      if (kestrel?.getProperty('birds:carrying') !== true) missing.push('carrying');
    } catch {
      missing.push('kestrel');
    }
    console.log(`[Birds of Prey] selftest found ${JSON.stringify(counts)}`);
    console.log(missing.length ? `[Birds of Prey] selftest FAIL missing: ${missing.join(' ')}` : '[Birds of Prey] selftest PASS');
  }, 10);
}
