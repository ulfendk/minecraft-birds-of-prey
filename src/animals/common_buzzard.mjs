import { barred, bird, breast, flecked, mottle, region, scaled, streaked, tailBars, underside } from '../lib/plumage.mjs';

export default bird({
  id: 'common_buzzard',
  name: 'Common Buzzard',
  group: 'hawk',
  size: [0.7, 0.9],
  scale: 0.95,
  health: 14,
  flySpeed: 0.2,
  xp: 3,
  attack: { damage: 4, speed: 1.6 },
  hunts: ['rabbit', 'frog', 'silverfish'],
  huntRange: 20,
  soars: true,
  spawn: [{ biomes: ['plains'], weight: 4 }, { biomes: ['forest'], weight: 3 }],
  sounds: { ambient: 'mob.phantom.idle', hurt: 'mob.parrot.hurt', death: 'mob.parrot.death', pitch: [1.7, 1.9], interval: 16 },
  egg: ['#6a4a30', '#e8dcc4'],
  body: { bodyW: 6, bodyH: 5, bodyL: 10, headW: 4, headH: 4, headD: 4, wingL: 13, wingD: 7, tip: 4, tailL: 6, tailW: 4, eye: '#5a3a20' },
  materials: {
    // Brown, with the pale band across the chest.
    body: { base: '#6a4a30', layers: [region('#e8dcc4', ({ face: f, p }) => (f === 'bottom' || f === 'front') && p[2] > -1 && p[2] < 2), streaked('#4a3018', { density: 0.3, where: breast })] },
    wing: { base: '#5e4028', layers: [scaled(0.14), mottle(0.08)] },
    primaries: '#2a1e14',
    tail: { base: '#7a5a3e', layers: [tailBars('#4a3420', { period: 2 })] },
    head: { base: '#6a4a30', layers: [mottle(0.08)] },
    cere: '#e8d04a',
    beak: '#2a2420',
    legs: '#7a5a3e',
    foot: '#e8d04a',
  },
  motion: { span: 8, flap: 18, flapLength: 0.7 },
});
