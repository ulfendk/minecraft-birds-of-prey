import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'red_kite',
  name: 'Red Kite',
  group: 'hawk',
  size: [0.65, 0.85],
  scale: 0.9,
  health: 12,
  flySpeed: 0.22,
  xp: 3,
  attack: { damage: 3, speed: 1.6 },
  hunts: ['rabbit', 'silverfish', 'frog'],
  huntRange: 20,
  soars: true,
  scavenger: true,
  spawn: [{ biomes: ['plains'], weight: 2 }, { biomes: ['forest', 'meadow'], weight: 1 }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.6, 1.8], interval: 20 },
  egg: ['#a8482a', '#c8ccd4'],
  body: { bodyW: 5, bodyH: 5, bodyL: 9, headW: 4, headH: 4, headD: 4, wingL: 14, wingD: 6, tip: 5, tailL: 9, tailW: 5, fork: true, eye: '#e8d04a' },
  materials: {
    body: { base: '#a8482a', layers: [streaked('#4a2010', { density: 0.35 })] },
    wing: { base: '#8a3e24', layers: [region('#3a1e12', ({ p }) => p[2] < -2), scaled(0.2)] },
    // The pale window in the outer wing, then black tips.
    primaries: { base: '#e8e4dc', layers: [region('#1e1612', ({ p }) => Math.abs(p[0]) > 15)] },
    tail: '#c8582e',
    head: { base: '#c8ccd4', layers: [streaked('#5a5e66', { density: 0.3 })] },
    cere: '#e8d04a',
    beak: '#2a2420',
    legs: '#a8482a',
    foot: '#e8d04a',
  },
  motion: { span: 6, flap: 18, flapLength: 0.7 },
});
