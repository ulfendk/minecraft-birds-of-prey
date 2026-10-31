import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'harris_hawk',
  name: "Harris's Hawk",
  group: 'hawk',
  size: [0.65, 0.9],
  scale: 0.85,
  health: 12,
  flySpeed: 0.26,
  xp: 3,
  attack: { damage: 4, speed: 1.8 },
  hunts: ['rabbit', 'chicken', 'venomous_snake'],
  huntRange: 24,
  alertsPack: true,
  falconry: { chance: 0.4 },
  spawn: [{ biomes: ['desert', 'mesa'], weight: 2, group: [2, 3] }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [0.9, 1.0], interval: 20 },
  egg: ['#3a2618', '#a8502a'],
  body: { bodyW: 5, bodyH: 5, bodyL: 10, headW: 4, headH: 4, headD: 4, wingL: 12, wingD: 6, tip: 4, tailL: 8, tailW: 4, eye: '#3a2410' },
  materials: {
    body: { base: '#3a2618', layers: [mottle(0.08)] },
    // Chestnut shoulders.
    wing: { base: '#3a2618', layers: [region('#a8502a', ({ p }) => p[2] < 0)] },
    primaries: '#1e140c',
    tail: { base: '#2a1e14', layers: [region('#f0ece4', ({ p }) => p[2] < 6 || p[2] > 10)] },
    head: '#3a2618',
    cere: '#f2c230',
    beak: '#5a6a7a',
    legs: '#a8502a',
    foot: '#f2c230',
  },
  motion: { flap: 24, flapLength: 0.5 },
});
