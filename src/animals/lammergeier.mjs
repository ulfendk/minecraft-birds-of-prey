import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars } from '../lib/plumage.mjs';

export default bird({
  id: 'lammergeier',
  name: 'Lammergeier',
  group: 'vulture',
  size: [0.9, 1.05],
  scale: 1.3,
  health: 26,
  flySpeed: 0.22,
  xp: 6,
  attack: { damage: 4, speed: 1.4 },
  hunts: [],
  soars: true,
  scavenger: true,
  dropsBones: true,
  range: 40,
  spawn: [{ biomes: ['mountains'], weight: 2 }],
  loot: [{ item: 'feather', min: 2, max: 5 }, { item: 'bone', min: 0, max: 2 }],
  sounds: { ambient: 'mob.parrot.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.5, 1.7], interval: 30 },
  egg: ['#d87a3a', '#2a2a2e'],
  body: { bodyW: 6, bodyH: 6, bodyL: 12, neck: 1, headW: 4, headH: 4, headD: 5, beak: 2, wingL: 17, wingD: 7, tip: 6, tailL: 9, tailW: 4, eye: '#f4f0e0', ring: '#d82a1a',
    // The black mask and "beard" under the beak.
    marks: [{ face: 'left', x: 0, y: 1, w: 2, color: '#1a1a1a' }, { face: 'right', x: 3, y: 1, w: 2, color: '#1a1a1a' }, { face: 'front', x: 1, y: 3, w: 2, color: '#1a1a1a' }] },
  materials: {
    // Rust-orange underneath (it bathes in iron-rich mud), slate grey above.
    body: { base: '#3a3e44', layers: [region('#d87a3a', breast), mottle(0.08)] },
    wing: { base: '#3a3e44', layers: [streaked('#c8ccd0', { density: 0.2 })] },
    primaries: '#1e2024',
    tail: '#2e3236',
    head: '#efe4d0',
    cere: '#5a5e64',
    beak: '#5a5e64',
    legs: '#d87a3a',
    foot: '#7a7a7a',
  },
  motion: { span: 3, flap: 12, flapLength: 1.0 },
});
