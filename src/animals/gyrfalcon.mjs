import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'gyrfalcon',
  name: 'Gyrfalcon',
  group: 'falcon',
  size: [0.65, 0.9],
  scale: 0.9,
  health: 14,
  flySpeed: 0.3,
  xp: 5,
  attack: { damage: 5, speed: 2.0 },
  hunts: ['rabbit', 'chicken', 'parrot', 'bat'],
  huntRange: 32,
  stoops: true,
  falconry: { chance: 0.2 },
  spawn: [{ biomes: ['snowy'], weight: 2 }, { biomes: ['mountains'], weight: 1 }],
  sounds: { ambient: 'mob.phantom.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.6, 1.8], interval: 20 },
  egg: ['#f4f2ec', '#3a3a40'],
  body: { bodyW: 5, bodyH: 5, bodyL: 10, headW: 4, headH: 4, headD: 4, wingL: 12, wingD: 6, tip: 5, tailL: 7, tailW: 3, ring: '#e8c23a' },
  materials: {
    // The white morph, flecked with black.
    body: { base: '#f4f2ec', layers: [flecked('#2a2a30', { density: 0.18 })] },
    wing: { base: '#f0eee8', layers: [barred('#3a3a42', { period: 3 })] },
    primaries: '#4a4a52',
    tail: { base: '#f4f2ec', layers: [tailBars('#5a5a62', { period: 3 })] },
    head: { base: '#f4f2ec', layers: [flecked('#3a3a40', { density: 0.12 })] },
    cere: '#e8c23a',
    beak: '#5a6a7a',
    legs: '#f4f2ec',
    foot: '#e8c23a',
  },
  motion: { flap: 26, flapLength: 0.45 },
});
