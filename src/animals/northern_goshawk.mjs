import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'northern_goshawk',
  name: 'Northern Goshawk',
  group: 'hawk',
  size: [0.65, 0.9],
  scale: 0.9,
  health: 14,
  flySpeed: 0.28,
  xp: 4,
  attack: { damage: 5, speed: 2.0 },
  hunts: ['rabbit', 'chicken', 'parrot'],
  huntRange: 24,
  falconry: { chance: 0.25 },
  spawn: [{ biomes: ['taiga', 'forest'], weight: 2 }, { biomes: ['dark_forest'], weight: 1 }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [0.8, 0.9], interval: 22 },
  egg: ['#4e5862', '#e8e4dc'],
  body: { bodyW: 5, bodyH: 5, bodyL: 10, headW: 4, headH: 4, headD: 4, wingL: 11, wingD: 6, tip: 4, tailL: 8, tailW: 4, eye: '#e86a1a',
    // The white eyebrow over a dark mask.
    marks: [{ face: 'left', x: 0, y: 0, w: 3, color: '#f0ece4' }, { face: 'right', x: 1, y: 0, w: 3, color: '#f0ece4' }] },
  materials: {
    body: { base: '#4e5862', layers: [region('#ece8e0', breast), barred('#6a6e74', { period: 2, where: breast })] },
    wing: { base: '#4a545e', layers: [mottle(0.06)] },
    primaries: '#2a3036',
    tail: { base: '#5a646e', layers: [tailBars('#2e343a', { period: 3 })] },
    head: { base: '#2e343a', layers: [region('#ece8e0', ({ face: f, j }) => f === 'front' && j >= 3)] },
    cere: '#e8c23a',
    beak: '#1e2226',
    legs: { base: '#ece8e0', layers: [barred('#6a6e74')] },
    foot: '#e8c23a',
  },
  motion: { flap: 26, flapLength: 0.45 },
});
