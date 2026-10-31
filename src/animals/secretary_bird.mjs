import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars } from '../lib/plumage.mjs';

export default bird({
  id: 'secretary_bird',
  name: 'Secretary Bird',
  group: 'vulture',
  movement: 'walk',
  size: [0.7, 1.4],
  scale: 1.1,
  health: 18,
  speed: 0.26,
  xp: 4,
  attack: { damage: 7, speed: 1.6 },
  // Thick scales on its long legs keep a snake's bite out (scripts/behaviours.js).
  venomProof: true,
  // Venomous snakes come from the Safari Animals add-on, when it is installed.
  hunts: ['venomous_snake', 'rabbit', 'frog', 'silverfish'],
  huntRange: 16,
  spawn: [{ biomes: ['savanna'], weight: 3 }],
  sounds: { ambient: 'mob.frog.ambient', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [0.5, 0.6], interval: 20 },
  egg: ['#c8ccd0', '#1e1e20'],
  body: { bodyW: 5, bodyH: 5, bodyL: 10, lean: -20, tarsus: 10, thigh: 4, neck: 3, headW: 4, headH: 4, headD: 4, wingL: 13, wingD: 7, tip: 5, tailL: 10, tailW: 2, crest: true, eye: '#3a2a1a',
    // Bare orange face around the eye.
    marks: [{ face: 'left', x: 0, y: 1, w: 3, h: 2, color: '#f08a30' }, { face: 'right', x: 1, y: 1, w: 3, h: 2, color: '#f08a30' }] },
  materials: {
    body: '#c8ccd0',
    wing: { base: '#b8bcc0', layers: [region('#1e1e20', ({ p }) => p[2] > 4)] },
    primaries: '#1e1e20',
    tail: { base: '#c8ccd0', layers: [region('#1e1e20', ({ p }) => p[2] > 12)] },
    head: '#c8ccd0',
    crest: '#1e1e20',
    cere: '#8a9aa0',
    beak: '#5a6064',
    // Black "trousers", long pink legs.
    legs: '#1e1e20',
    foot: '#e8a890',
  },
  motion: { flap: 18, flapLength: 0.6 },
});
