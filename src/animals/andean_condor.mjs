import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars } from '../lib/plumage.mjs';

export default bird({
  id: 'andean_condor',
  name: 'Andean Condor',
  group: 'vulture',
  size: [0.95, 1.1],
  scale: 1.4,
  health: 30,
  flySpeed: 0.2,
  xp: 7,
  attack: { damage: 4, speed: 1.4 },
  hunts: [],
  soars: true,
  scavenger: true,
  range: 40,
  spawn: [{ biomes: ['mountains'], weight: 1 }, { biomes: ['mesa'], weight: 1 }],
  loot: [{ item: 'feather', min: 2, max: 6 }],
  sounds: { ambient: 'mob.cat.hiss', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [0.5, 0.6], interval: 30 },
  egg: ['#1a1a1a', '#f4f2ec'],
  body: { bodyW: 7, bodyH: 6, bodyL: 12, neck: 2, headW: 3, headH: 3, headD: 5, beak: 1, wingL: 18, wingD: 8, tip: 7, tailL: 6, tailW: 5, ruff: true, eye: '#8a2a1a', lean: -45,
    // The male's crest (caruncle) on the bald head.
    marks: [{ face: 'top', x: 1, y: 0, h: 4, color: '#5a2a2a' }] },
  materials: {
    body: '#1a1a1a',
    // White panels on the upper wing.
    wing: { base: '#1a1a1a', layers: [region('#f0eee8', ({ face: f, p }) => f === 'top' && p[2] > -2)] },
    primaries: '#141414',
    tail: '#1a1a1a',
    head: { base: '#8a4a3a', layers: [mottle(0.15)] },
    ruff: '#f4f2ec',
    cere: '#8a4a3a',
    beak: '#d8c8a8',
    legs: '#2a2a2a',
    foot: '#7a7a7a',
  },
  motion: { span: 4, flap: 12, flapLength: 1.0 },
});
