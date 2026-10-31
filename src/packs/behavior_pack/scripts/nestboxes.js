// Nest boxes: kestrels, barn owls and tawny owls move into them and raise chicks.
// Placed boxes are remembered in a world property (scripts can't search for blocks).
import { system, world } from '@minecraft/server';
import { SPECIES } from './data.js';
import { birdName, chance, NS, speciesOf, tellWith } from './util.js';

const KEY = `${NS}:nest_boxes`;
const BOX = `${NS}:nest_box`;
const NESTERS = Object.entries(SPECIES).filter(([, s]) => s.nests).map(([id, s]) => ({ id, owl: s.owl }));

const load = () => {
  try { return JSON.parse(String(world.getDynamicProperty(KEY) ?? '[]')); } catch { return []; }
};
const save = (boxes) => world.setDynamicProperty(KEY, JSON.stringify(boxes.slice(-200)));
const same = (a, b) => a.d === b.d && a.x === b.x && a.y === b.y && a.z === b.z;

function check() {
  const boxes = load();
  const keep = [];
  for (const box of boxes) {
    const dimension = world.getDimension(box.d);
    let block;
    try { block = dimension.getBlock(box); } catch { keep.push(box); continue; }
    if (!block) { keep.push(box); continue; } // not loaded
    if (block.typeId !== BOX) continue; // broken some other way
    keep.push(box);
    const players = dimension.getPlayers({ location: box, maxDistance: 64 });
    if (!players.length) continue;
    const at = { x: box.x + 0.5, y: box.y + 1.2, z: box.z + 0.5 };
    const residents = dimension.getEntities({ families: [NS], location: at, maxDistance: 12 }).filter((e) => NESTERS.some((n) => n.id === speciesOf(e)));
    if (!residents.length) {
      if (!chance(0.25)) continue;
      // Owls take over at night, kestrels by day.
      const night = world.getTimeOfDay() > 13000 && world.getTimeOfDay() < 23000;
      const options = NESTERS.filter((n) => n.owl === night);
      const pick = options[Math.floor(Math.random() * options.length)] ?? NESTERS[0];
      for (let i = 0; i < 2; i++) dimension.spawnEntity(`${NS}:${pick.id}<${NS}:spawn_adult>`, at);
      for (const p of players) tellWith(p, 'nest.moved_in', [birdName(pick.id)]);
    } else {
      const id = speciesOf(residents[0]);
      const adults = residents.filter((e) => speciesOf(e) === id && !e.getComponent('minecraft:is_baby'));
      const young = residents.filter((e) => e.getComponent('minecraft:is_baby'));
      if (adults.length >= 2 && young.length < 2 && chance(0.15)) {
        dimension.spawnEntity(`${NS}:${id}<${NS}:entity_born>`, at);
        dimension.playSound('block.turtle_egg.crack', at);
        for (const p of players) tellWith(p, 'nest.chick', []);
      }
    }
  }
  if (keep.length !== boxes.length) save(keep);
}

export function setupNestBoxes() {
  world.afterEvents.playerPlaceBlock.subscribe(({ block }) => {
    if (block.typeId !== BOX) return;
    const box = { d: block.dimension.id, x: block.x, y: block.y, z: block.z };
    save([...load().filter((b) => !same(b, box)), box]);
  });
  world.afterEvents.playerBreakBlock.subscribe(({ block, brokenBlockPermutation }) => {
    if (brokenBlockPermutation.type.id !== BOX) return;
    const box = { d: block.dimension.id, x: block.x, y: block.y, z: block.z };
    save(load().filter((b) => !same(b, box)));
  });
  system.runInterval(check, 1200);
}
