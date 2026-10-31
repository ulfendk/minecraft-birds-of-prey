import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'sparrowhawk',
  name: 'Sparrowhawk',
  group: 'hawk',
  size: [0.5, 0.7],
  scale: 0.65,
  health: 8,
  flySpeed: 0.3,
  xp: 2,
  attack: { damage: 3, speed: 2.2 },
  hunts: ['parrot', 'bat', 'frog', 'small'],
  huntRange: 20,
  falconry: { chance: 0.3 },
  spawn: [{ biomes: ['forest'], weight: 3 }, { biomes: ['plains'], weight: 1 }],
  loot: [{ item: 'feather', min: 0, max: 2 }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.3, 1.5], interval: 20 },
  egg: ['#5a6a7a', '#d87a40'],
  body: { bodyW: 4, bodyH: 4, bodyL: 9, headW: 4, headH: 4, headD: 4, wingL: 10, wingD: 5, tip: 4, tailL: 8, tailW: 3, eye: '#f0a020' },
  materials: {
    // A male: slate-blue back, rusty orange bars on the chest.
    body: { base: '#5a6a7a', layers: [region('#f0e0cc', breast), barred('#d07040', { period: 2, where: breast })] },
    wing: { base: '#56667a', layers: [mottle(0.05)] },
    primaries: '#2e3640',
    tail: { base: '#5a6a7a', layers: [tailBars('#2e3640', { period: 3 })] },
    head: { base: '#56667a', layers: [region('#d88050', ({ face: f, j }) => (f === 'left' || f === 'right') && j >= 2), region('#f0e0cc', ({ face: f, j }) => f === 'front' && j >= 2)] },
    cere: '#e8d04a',
    beak: '#2a2e34',
    legs: { base: '#f0e0cc', layers: [barred('#d07040')] },
    foot: '#e8d04a',
  },
  motion: { flap: 28, flapLength: 0.35 },
});
