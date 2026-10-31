// Renders every animal (rest pose, walking, sleeping, from two sides) into
// build/preview/, plus a contact sheet of all animals: build/preview/sheet.png.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build, HIDDEN } from './build.mjs';
import { render, sheet } from './render.mjs';

const RP = 'build/resource_pack';
const OUT = 'build/preview';
const only = process.argv.slice(2);

const { animals } = await build({ quiet: true });
await mkdir(OUT, { recursive: true });
const thumbs = [];
for (const a of animals) {
  if (only.length && !only.includes(a.id)) continue;
  const geo = JSON.parse(await readFile(join(RP, 'models/entity', `${a.id}.geo.json`), 'utf8'));
  const tex = await readFile(join(RP, 'textures/entity/birds', `${a.id}.png`));
  const anims = JSON.parse(await readFile(join(RP, 'animations', `${a.id}.animation.json`), 'utf8')).animations;
  const get = (n) => anims[`animation.birds.${a.id}.${n}`];
  const hidden = HIDDEN;
  const views = [
    render(geo, tex, { hidden, yaw: 35 }),
    render(geo, tex, { hidden, yaw: 325 }),
    render(geo, tex, { hidden, yaw: 35, anim: get('walk'), time: 0.25 }),
    render(geo, tex, { hidden, yaw: 90, pitch: 5, anim: get('fly'), time: 0.1 }),
    render(geo, tex, { hidden, yaw: 35, anim: get('sleep') ?? get('idle'), time: 0 }),
    render(geo, tex, { hidden, yaw: 20, pitch: 35, anim: get('glide'), time: 0 }),
  ];
  await writeFile(join(OUT, `${a.id}.png`), sheet(views, { cols: 3 }));
  thumbs.push(views[0]);
}
await writeFile(join(OUT, 'sheet.png'), sheet(thumbs, { cols: 6 }));
console.log(`Wrote previews for ${thumbs.length} animals to ${OUT}/`);
