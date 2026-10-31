// Pack icon: an eagle with spread wings against a dusk sky over mountains, drawn at 32x32 and scaled up.
import { PNG } from 'pngjs';
import { hex, mix } from './texture.mjs';

export function packIcon(scale = 8) {
  const N = 32;
  const px = Array.from({ length: N }, () => new Array(N));
  const sky = [hex('#1d2342'), hex('#3a3f6e'), hex('#c06a3a'), hex('#f2b45a')];
  for (let y = 0; y < N; y++) {
    const t = y / 26;
    const c = t < 0.45 ? mix(sky[0], sky[1], t / 0.45) : t < 0.8 ? mix(sky[1], sky[2], (t - 0.45) / 0.35) : mix(sky[2], sky[3], (t - 0.8) / 0.2);
    for (let x = 0; x < N; x++) px[y][x] = c;
  }
  // Sun low behind the peaks
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 22, y - 24);
    if (d < 5) px[y][x] = mix(hex('#fff2c0'), hex('#ffc46a'), d / 5);
  }
  // Mountains
  const ridge = (x) => Math.min(31, 24 + Math.abs(((x * 7) % 11) - 5) * 0.6 - (x > 6 && x < 14 ? 6 - Math.abs(x - 10) * 1.4 : 0));
  for (let x = 0; x < N; x++) for (let y = Math.floor(ridge(x)); y < N; y++) px[y][x] = y === Math.floor(ridge(x)) && x > 7 && x < 13 ? hex('#e8e4f0') : hex('#232036');

  const dark = hex('#1a120c'), brown = hex('#5a3a20'), gold = hex('#c8963a'), white = hex('#f4efe4'), yellow = hex('#f2c230');
  const fill = (x0, y0, x1, y1, c = dark) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < N && x >= 0 && x < N) px[y][x] = c; };
  // Eagle seen from below, wings raised in a shallow V, primaries fingered.
  fill(14, 9, 17, 19, brown); // body
  fill(15, 6, 16, 9, gold); // head
  fill(15, 5, 16, 5, gold);
  fill(15, 10, 16, 10, gold);
  fill(14, 19, 17, 22, brown); fill(13, 21, 18, 22, brown); // tail
  for (let i = 0; i < 12; i++) {
    const y = 11 - Math.floor(i / 3);
    fill(13 - i, y, 13 - i, y + 3, brown);
    fill(18 + i, y, 18 + i, y + 3, brown);
  }
  for (const f of [0, 2, 4]) { fill(1, 7 + f, 2, 7 + f, dark); fill(29, 7 + f, 30, 7 + f, dark); } // fingers
  fill(1, 8, 3, 11, dark); fill(28, 8, 30, 11, dark);
  fill(15, 3, 16, 4, yellow); // beak
  fill(15, 13, 16, 14, white); // pale chest patch
  const png = new PNG({ width: N * scale, height: N * scale });
  for (let y = 0; y < N * scale; y++) for (let x = 0; x < N * scale; x++) {
    png.data.set(px[Math.floor(y / scale)][Math.floor(x / scale)], (y * N * scale + x) * 4);
  }
  return PNG.sync.write(png);
}
