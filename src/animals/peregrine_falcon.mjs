import { barred, bird, breast, face, region, tailBars } from '../lib/plumage.mjs';
import { mottle } from '../lib/texture.mjs';

export default bird({
  id: 'peregrine_falcon',
  name: 'Peregrine Falcon',
  group: 'falcon',
  size: [0.6, 0.85],
  scale: 0.8,
  health: 10,
  flySpeed: 0.3,
  attack: { damage: 4, speed: 2.0 },
  hunts: ['chicken', 'parrot', 'bat', 'rabbit'],
  huntRange: 32,
  stoops: true,
  falconry: { chance: 0.3 },
  spawn: [{ biomes: ['mountains', 'beach'], weight: 3 }, { biomes: ['plains'], weight: 1 }],
  sounds: { ambient: 'mob.phantom.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.7, 1.9], interval: 18 },
  egg: ['#4a5560', '#e9e2d0'],
  body: {
    bodyW: 5, bodyH: 5, bodyL: 9, neck: 1, headW: 4, headH: 4, headD: 4,
    wingL: 11, wingD: 6, tip: 5, tailL: 6, tailW: 3, ring: '#e8c23a',
    // The dark "moustache" below the eye.
    marks: [{ face: 'left', x: 1, y: 2, h: 2, color: '#1e2328' }, { face: 'right', x: 2, y: 2, h: 2, color: '#1e2328' }],
  },
  materials: {
    body: { base: '#56616c', layers: [region('#ece4d2', breast), barred('#8a8278', { period: 3, where: (ctx) => breast(ctx) && ctx.p[2] > 0 }), mottle(0.06)] },
    wing: { base: '#4e5964', layers: [barred('#3c4550', { period: 2 })] },
    primaries: '#262c33',
    tail: { base: '#56616c', layers: [tailBars('#2f363d', { period: 2 })] },
    head: { base: '#23292f', layers: [region('#ece4d2', ({ face: f, j }) => (f === 'front' && j >= 2) || f === 'bottom')] },
    cere: '#e8c23a',
    beak: '#3a4a5a',
    legs: { base: '#e6ddc8', layers: [barred('#6a6058')] },
    foot: '#e8c23a',
  },
  motion: { flap: 28, flapLength: 0.4 },
});
