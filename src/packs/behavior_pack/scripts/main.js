import { system, world } from '@minecraft/server';
import { setupBehaviours } from './behaviours.js';
import { setupBinoculars } from './binoculars.js';
import { setupBirdGuide } from './birdguide.js';
import { setupContests } from './contest.js';
import { setupFalconry } from './falconry.js';
import { setupGear } from './gear.js';
import { setupHides } from './hides.js';
import { setupNestBoxes } from './nestboxes.js';
import { setupRinging } from './ringing.js';
import { selfTest } from './selftest.js';

world.afterEvents.worldLoad.subscribe(() => {
  setupBirdGuide();
  setupBinoculars();
  setupFalconry();
  setupRinging();
  setupGear();
  setupHides();
  setupNestBoxes();
  setupBehaviours();
  setupContests();
  console.log('[Birds of Prey] loaded');
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === 'birds:selftest') selfTest(event.message);
});
