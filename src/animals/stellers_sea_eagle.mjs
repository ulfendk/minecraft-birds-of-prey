import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'stellers_sea_eagle',
  name: "Steller's Sea Eagle",
  group: 'eagle',
  size: [0.9, 1.1],
  scale: 1.3,
  health: 28,
  flySpeed: 0.22,
  xp: 7,
  attack: { damage: 7, speed: 1.5 },
  hunts: ['fish', 'rabbit'],
  huntRange: 32,
  soars: true,
  spawn: [{ biomes: ['snowy'], weight: 2 }],
  loot: [{ item: 'feather', min: 2, max: 5 }],
  sounds: { ambient: 'mob.phantom.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.2, 1.4], interval: 24 },
  egg: ['#1e1a18', '#f08a20'],
  body: { bodyW: 7, bodyH: 6, bodyL: 12, headW: 4, headH: 4, headD: 5, beak: 3, wingL: 16, wingD: 8, tip: 6, tailL: 7, tailW: 4, eye: '#e8d04a' },
  materials: {
    // White shoulders and thighs on black.
    body: { base: '#221e1c', layers: [mottle(0.06)] },
    wing: { base: '#221e1c', layers: [region('#f4f2ec', ({ p }) => p[2] < -3)] },
    primaries: '#141210',
    tail: '#f4f2ec',
    head: { base: '#2a2420', layers: [flecked('#6a6460', { density: 0.2 })] },
    cere: '#f08a20',
    beak: '#f08a20',
    legs: '#f4f2ec',
    foot: '#f2c230',
  },
  motion: { span: 4, flap: 16, flapLength: 0.9 },
});
