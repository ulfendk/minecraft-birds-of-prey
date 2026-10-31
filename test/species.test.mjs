// Unit tests for the bird, item and text data (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadAnimals, racePoints } from '../tools/build.mjs';
import { items } from '../src/items.mjs';
import { blocks } from '../src/blocks.mjs';
import { BIOME_TAGS, hitbox } from '../src/lib/behavior.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { moveStates } from '../src/lib/client.mjs';
import { langEntries, LOCALES } from '../src/lang.mjs';
import { BIOME_NAMES, GROUPS } from '../src/lib/info.mjs';
import { guide } from '../src/guide.mjs';

const animals = await loadAnimals();

test('22 birds in five groups', () => {
  assert.equal(animals.length, 22);
  for (const a of animals) assert.ok(GROUPS[a.group], `${a.id}: unknown group ${a.group}`);
  for (const g of Object.keys(GROUPS)) assert.ok(animals.some((a) => a.group === g), `no birds in group ${g}`);
});

test('every bird has a guide text, a model that fits a texture, and every posture animation', () => {
  for (const a of animals) {
    assert.ok(guide[a.id], `${a.id}: no guide text`);
    const geo = buildGeometry(`geometry.birds.${a.id}`, a.model);
    assert.ok(geo.width <= 256 && geo.height <= 256, a.id);
    for (const s of moveStates(a)) assert.ok(a.anims[s.anim], `${a.id}: no ${s.anim} animation`);
    for (const n of ['idle', 'attack', 'call']) assert.ok(a.anims[n], `${a.id}: no ${n} animation`);
  }
});

test('every habitat maps to Bedrock biome tags and has a name', () => {
  for (const a of animals) {
    assert.ok(a.spawn.length, `${a.id} never spawns`);
    for (const s of a.spawn) for (const b of s.biomes) assert.ok(BIOME_TAGS[b] && BIOME_NAMES[b], `${a.id}: ${b}`);
  }
});

test('falconry birds can wear a hood, and there are falcons, hawks, an eagle and owls to train', () => {
  const trained = animals.filter((a) => a.falconry);
  for (const a of trained) assert.ok(a.model.bones.some((b) => b.name === 'hood'), a.id);
  for (const g of ['falcon', 'hawk', 'eagle', 'owl']) assert.ok(trained.some((a) => a.group === g), `no ${g} for falconry`);
  for (const a of animals.filter((x) => !x.falconry)) assert.ok(!a.model.bones.some((b) => b.name === 'hood'), a.id);
});

test('bird race points reward rare birds', () => {
  const common = animals.find((a) => a.id === 'common_buzzard');
  const rare = animals.find((a) => a.id === 'andean_condor');
  assert.ok(racePoints(rare) > racePoints(common));
  for (const a of animals) assert.ok(racePoints(a) >= 1 && racePoints(a) <= 5, a.id);
});

test('birds stay a sensible size', () => {
  for (const a of animals) {
    const [w, h] = hitbox(a);
    assert.ok(w <= 1.4 && h <= 1.7, `${a.id}: ${w}x${h}`);
  }
});

test('English and Danish have the same texts', () => {
  const pkg = { description: 'x', version: '0.0.0' };
  const [en, da] = LOCALES.map((l) => new Map(langEntries(l, { animals, items, blocks, ...pkg })));
  assert.deepEqual([...en.keys()].sort(), [...da.keys()].sort());
  for (const [k, v] of da) assert.ok(v, `da: empty ${k}`);
  for (const a of animals) assert.notEqual(da.get(`entity.birds:${a.id}.name`), a.name, `${a.id} has no Danish name`);
  for (const i of items) assert.notEqual(da.get(`item.birds:${i.id}.name`), i.name, `${i.id} has no Danish name`);
});
