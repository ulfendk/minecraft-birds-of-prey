import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'marsh_harrier',
  name: 'Marsh Harrier',
  group: 'hawk',
  size: [0.65, 0.85],
  scale: 0.85,
  health: 12,
  flySpeed: 0.2,
  xp: 3,
  attack: { damage: 3, speed: 1.6 },
  hunts: ['frog', 'chicken', 'rabbit', 'fish'],
  huntRange: 20,
  soars: true,
  spawn: [{ biomes: ['swamp'], weight: 3 }, { biomes: ['river'], weight: 1 }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.4, 1.6], interval: 20 },
  egg: ['#5a3a22', '#e8d8a0'],
  body: { bodyW: 4, bodyH: 5, bodyL: 9, headW: 4, headH: 4, headD: 4, wingL: 14, wingD: 6, tip: 5, tailL: 9, tailW: 3, eye: '#e8d04a' },
  materials: {
    body: { base: '#5a3a22', layers: [streaked('#3a2412', { density: 0.3 })] },
    wing: { base: '#5a3a22', layers: [scaled(0.12)] },
    primaries: '#1e140c',
    tail: '#6a4a30',
    // The female's cream cap and throat.
    head: { base: '#e8d8a0', layers: [region('#4a2e1a', ({ face: f, j }) => (f === 'left' || f === 'right') && j >= 2)] },
    cere: '#e8d04a',
    beak: '#2a2420',
    legs: '#5a3a22',
    foot: '#e8d04a',
  },
  motion: { span: 18, flap: 16, flapLength: 0.6 },
});
