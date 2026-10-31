// Custom blocks. The bird hide is a camouflaged wall with a viewing slit: wild birds
// don't notice players next to one (scripts/hides.js). Owls and kestrels move into
// nest boxes and raise chicks there (scripts/nestboxes.js). The Golden Raptor is the
// contest winner's trophy (scripts/contest.js), a gold eagle on a stand to put on display.
import { PNG } from 'pngjs';
import { NS } from './lib/constants.mjs';
import { hex, mix, pixelIcon } from './lib/texture.mjs';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function texture(paint) {
  const png = new PNG({ width: 16, height: 16 });
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) png.data.set(paint(x, y), (y * 16 + x) * 4);
  return PNG.sync.write(png);
}

/** Weathered vertical boards. */
function boards(x, y, rand, light = '#8a6a44', dark = '#5e4528') {
  if (x % 4 === 3) return hex('#3e2c1a');
  const grain = (x * 7 + Math.floor(y / 3) * 3 + Math.floor(rand() * 3)) % 5 / 5;
  return mix(hex(light), hex(dark), grain * 0.6 + rand() * 0.2);
}

/** Boards half hidden under brushwood and leaves, with the slit as a dark band. */
function hideTexture() {
  const rand = rng(5);
  const leaves = ['#3f5f2a', '#56772f', '#2f4a22', '#6b8a3a'];
  return texture((x, y) => {
    if (y === 7 || y === 8) return hex(x % 4 === 3 ? '#20160c' : '#14100a');
    const r = rand();
    if (r < 0.42 + (y > 11 ? 0.15 : 0)) return hex(leaves[Math.floor(rand() * leaves.length)]);
    if (r < 0.5) return hex('#7a5a30');
    return boards(x, y, rand, '#6e5636', '#4a3820');
  });
}

function nestBoxSide() {
  const rand = rng(9);
  return texture((x, y) => (y < 2 ? hex(y === 0 ? '#3e2c1a' : '#5a4228') : boards(x, y, rand)));
}

/** The front: an entrance hole with a little perch below it. */
function nestBoxFront() {
  const rand = rng(13);
  return texture((x, y) => {
    const d = Math.hypot(x - 7.5, y - 6.5);
    if (d < 2.6) return hex('#0e0a06');
    if (d < 3.4) return hex('#3e2c1a');
    if (y === 11 && x >= 6 && x <= 9) return hex('#3a2a18');
    if (y === 12 && x >= 7 && x <= 8) return hex('#2a1e10');
    return y < 2 ? hex(y === 0 ? '#3e2c1a' : '#5a4228') : boards(x, y, rand);
  });
}

/** Polished gold: bright with a few highlights and darker hollows. */
function goldTexture() {
  const rand = rng(21);
  return texture((x, y) => {
    if ((x + y) % 7 === 0 && rand() < 0.5) return hex('#fff2a8');
    return mix(hex('#f2c230'), hex('#a8780e'), ((x * 3 + y * 5) % 9) / 14 + rand() * 0.15);
  });
}

/** Dark polished wood for the trophy's stand. */
function standTexture() {
  const rand = rng(17);
  return texture((x, y) => (y === 0 || y === 15 ? hex('#2a180c') : mix(hex('#5a3a1e'), hex('#3a2412'), ((x * 5 + Math.floor(y / 4)) % 6) / 8 + rand() * 0.15)));
}

/** A box whose every listed face shows a whole 16x16 texture (or a named extra texture). */
const box = (origin, size, faces = ['north', 'south', 'east', 'west', 'up', 'down'], material) => ({
  origin, size,
  uv: Object.fromEntries(faces.map((f) => [f, { uv: [0, 0], uv_size: [16, 16], ...(material ? { material_instance: material } : {}) }])),
});
const gold = (origin, size) => box(origin, size, undefined, 'gold');

const geometry = (id, cubes) => ({
  format_version: '1.12.0',
  'minecraft:geometry': [{
    description: { identifier: `geometry.${NS}.${id}`, texture_width: 16, texture_height: 16 },
    bones: [{ name: 'block', pivot: [0, 0, 0], cubes }],
  }],
});

/** The trophy's picture on the website (in game it shows as the 3D block). */
const ICON = pixelIcon([
  '......kk........',
  '.....kyyk.......',
  '.....kyyyo......',
  '......kyyk......',
  '..kk..kyyk..kk..',
  '.kyyk.kyyk.kyyk.',
  '..kyykyyyykyyk..',
  '...kyyyyyyyyk...',
  '....kyyyyyyk....',
  '.....kyyyyk.....',
  '......kyyk......',
  '.....kkyykk.....',
  '....kwwwwwwk....',
  '....kWWWWWWk....',
  '....kkkkkkkk....',
  '................',
], { '.': null, k: '#5a3a08', y: '#f2c230', o: '#e89a20', w: '#6e4a2a', W: '#4a301a' });

export const blocks = [
  {
    id: 'bird_hide',
    name: 'Bird Hide',
    sound: 'wood',
    texture: hideTexture(),
    // Two boards with a viewing slit between them.
    geometry: geometry('bird_hide', [box([-8, 0, -8], [16, 7, 16]), box([-8, 9, -8], [16, 7, 16])]),
    definition: {
      format_version: '1.21.120',
      'minecraft:block': {
        description: {
          identifier: `${NS}:bird_hide`, menu_category: { category: 'construction' },
          traits: { 'minecraft:placement_direction': { enabled_states: ['minecraft:cardinal_direction'] } },
        },
        components: {
          'minecraft:geometry': `geometry.${NS}.bird_hide`,
          'minecraft:material_instances': { '*': { texture: `${NS}_bird_hide`, render_method: 'opaque' } },
          'minecraft:collision_box': true,
          'minecraft:selection_box': true,
          'minecraft:light_dampening': 0,
          'minecraft:destructible_by_mining': { seconds_to_destroy: 1.0 },
          'minecraft:destructible_by_explosion': { explosion_resistance: 3 },
          'minecraft:flammable': { catch_chance_modifier: 5, destroy_chance_modifier: 20 },
          'minecraft:map_color': '#4a6a2e',
          'minecraft:display_name': `tile.${NS}:bird_hide.name`,
        },
      },
    },
  },
  {
    id: 'nest_box',
    name: 'Nest Box',
    sound: 'wood',
    texture: nestBoxSide(),
    faces: { north: nestBoxFront() },
    geometry: geometry('nest_box', [box([-6, 0, -6], [12, 14, 12]), box([-7, 14, -7], [14, 2, 14])]),
    definition: {
      format_version: '1.21.120',
      'minecraft:block': {
        description: {
          identifier: `${NS}:nest_box`, menu_category: { category: 'construction' },
          traits: { 'minecraft:placement_direction': { enabled_states: ['minecraft:cardinal_direction'], y_rotation_offset: 180 } },
        },
        components: {
          'minecraft:geometry': `geometry.${NS}.nest_box`,
          'minecraft:material_instances': {
            '*': { texture: `${NS}_nest_box`, render_method: 'opaque' },
            north: { texture: `${NS}_nest_box_north`, render_method: 'opaque' },
          },
          'minecraft:collision_box': { origin: [-7, 0, -7], size: [14, 16, 14] },
          'minecraft:selection_box': { origin: [-7, 0, -7], size: [14, 16, 14] },
          'minecraft:light_dampening': 0,
          'minecraft:destructible_by_mining': { seconds_to_destroy: 1.0 },
          'minecraft:destructible_by_explosion': { explosion_resistance: 3 },
          'minecraft:flammable': { catch_chance_modifier: 5, destroy_chance_modifier: 20 },
          'minecraft:map_color': '#7a5a30',
          'minecraft:display_name': `tile.${NS}:nest_box.name`,
        },
        permutations: [
          ['north', 0], ['east', 270], ['south', 180], ['west', 90],
        ].map(([dir, y]) => ({
          condition: `q.block_state('minecraft:cardinal_direction') == '${dir}'`,
          components: { 'minecraft:transformation': { rotation: [0, y, 0] } },
        })),
      },
    },
  },
  {
    id: 'golden_raptor',
    name: 'Golden Raptor Trophy',
    sound: 'metal',
    texture: standTexture(),
    // Extra textures named by the cubes' material_instance rather than a face.
    faces: { gold: goldTexture() },
    icon: ICON,
    // A gold eagle with raised wings on a two-step wooden stand, facing whoever placed it.
    geometry: geometry('golden_raptor', [
      box([-5, 0, -5], [10, 2, 10]),
      box([-3.5, 2, -3.5], [7, 3, 7]),
      gold([-2, 5, -2], [4, 5, 4]),
      gold([-1.5, 5, 2], [3, 2, 2]),
      gold([-1.5, 10, -3], [3, 3, 3]),
      gold([-0.5, 10.5, -4], [1, 1.5, 1]),
      // Each wing steps up and out from the shoulder to the long primaries.
      ...[1, -1].flatMap((side) => [
        [2, 7.5, 2, 4], [3.5, 9, 2, 4], [5, 10.5, 2, 5.5],
      ].map(([x, y, w, h]) => gold([side > 0 ? x : -x - w, y, -1], [w, h, 1.5]))),
    ]),
    definition: {
      format_version: '1.21.120',
      'minecraft:block': {
        description: {
          identifier: `${NS}:golden_raptor`, menu_category: { category: 'items' },
          traits: { 'minecraft:placement_direction': { enabled_states: ['minecraft:cardinal_direction'], y_rotation_offset: 180 } },
        },
        components: {
          'minecraft:geometry': `geometry.${NS}.golden_raptor`,
          'minecraft:material_instances': {
            '*': { texture: `${NS}_golden_raptor`, render_method: 'opaque' },
            gold: { texture: `${NS}_golden_raptor_gold`, render_method: 'opaque' },
          },
          'minecraft:collision_box': { origin: [-5, 0, -5], size: [10, 16, 10] },
          'minecraft:selection_box': { origin: [-6, 0, -5], size: [12, 16, 10] },
          'minecraft:light_dampening': 0,
          'minecraft:light_emission': 4,
          'minecraft:destructible_by_mining': { seconds_to_destroy: 1.5 },
          'minecraft:destructible_by_explosion': { explosion_resistance: 6 },
          'minecraft:map_color': '#f2c230',
          'minecraft:display_name': `tile.${NS}:golden_raptor.name`,
        },
      },
    },
  },
];

// The hide is a wall: turn it to face the way it was placed, too. So does the trophy.
blocks[0].definition['minecraft:block'].permutations = blocks[1].definition['minecraft:block'].permutations;
blocks[2].definition['minecraft:block'].permutations = blocks[1].definition['minecraft:block'].permutations;

export const blockRecipes = [
  {
    'minecraft:recipe_shaped': {
      description: { identifier: `${NS}:bird_hide` },
      tags: ['crafting_table'],
      pattern: ['LLL', 'PSP'],
      key: { L: { item: 'minecraft:oak_leaves' }, P: { item: 'minecraft:oak_planks' }, S: { item: 'minecraft:stick' } },
      result: { item: `${NS}:bird_hide`, count: 2 },
      unlock: [{ item: 'minecraft:oak_leaves' }],
    },
  },
  {
    'minecraft:recipe_shaped': {
      description: { identifier: `${NS}:nest_box` },
      tags: ['crafting_table'],
      pattern: ['PPP', 'P P', 'PSP'],
      key: { P: { item: 'minecraft:oak_planks' }, S: { item: 'minecraft:stick' } },
      result: { item: `${NS}:nest_box` },
      unlock: [{ item: 'minecraft:oak_planks' }],
    },
  },
];
