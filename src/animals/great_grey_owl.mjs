import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars } from '../lib/plumage.mjs';

export default bird({
  id: 'great_grey_owl',
  name: 'Great Grey Owl',
  group: 'owl',
  size: [0.7, 0.95],
  scale: 1.0,
  health: 14,
  flySpeed: 0.2,
  xp: 4,
  attack: { damage: 3, speed: 1.6 },
  hunts: ['silverfish', 'rabbit', 'bat'],
  huntRange: 24,
  pellets: true,
  spawn: [{ biomes: ['taiga'], weight: 2 }],
  sounds: { ambient: 'note.flute', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [0.45, 0.5], interval: 24 },
  egg: ['#8a8a86', '#2a2a28'],
  body: { bodyW: 6, bodyH: 6, bodyL: 9, headW: 7, headH: 6, headD: 5, neck: 0, beak: 1, wingL: 12, wingD: 7, tip: 3, tailL: 6, tailW: 4, lean: -72, eye: '#f2d04a', pupil: '#14100c',
    // The black "bow tie" under the beak.
    marks: [{ face: 'front', x: 2, y: 5, w: 3, color: '#1e1e1c' }] },
  materials: {
    body: { base: '#8a8a86', layers: [streaked('#3e3e3a', { density: 0.4 }), mottle(0.1)] },
    wing: { base: '#7e7e7a', layers: [mottle(0.14), flecked('#c8c8c4', { density: 0.1 })] },
    primaries: { base: '#6e6e6a', layers: [barred('#3a3a38', { period: 2 })] },
    tail: { base: '#7e7e7a', layers: [tailBars('#3a3a38', { period: 2 })] },
    // Rings round the huge facial disc.
    head: { base: '#8a8a86', layers: [region('#b4b4b0', ({ face: f }) => f === 'front'), region('#5a5a56', ({ face: f, i, j }) => f === 'front' && (i === 0 || i === 6 || j === 0))] },
    cere: '#f2d04a',
    beak: '#f2d04a',
    legs: '#9a9a96',
    foot: '#9a9a96',
  },
  motion: { flap: 18, flapLength: 0.7 },
});
