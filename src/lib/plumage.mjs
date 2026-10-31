// Feather patterns for the texture painter (see texture.mjs for the layer format),
// and the defaults every bird spec starts from.
import { raptor as anims } from './anim.mjs';
import { commonMaterials, raptor as body } from './bodies.mjs';
import { hex, shade } from './texture.mjs';
import { all, bone, face } from './parts.mjs';

const hash = (a, b, c) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const gate = (where, fn) => (c, ctx) => (where && !where(ctx) ? c : fn(c, ctx));

/**
 * Thin bars across the feathers (hawks' breasts, tails, owls' backs). They run across the
 * body: along its length on the belly and back (the body is level in the model), up the chest.
 */
export const barred = (color, { period = 2, axis, where } = {}) =>
  gate(where, (c, { p, face: f }) => {
    const ax = axis ?? (f === 'top' || f === 'bottom' ? 2 : 1);
    return ((Math.floor(p[ax] + 0.01) % period) + period) % period === 0 ? hex(color) : c;
  });

/** Bars that follow the long axis of a part (tail and flight feathers, which lie along z). */
export const tailBars = (color, { period = 2, where } = {}) => barred(color, { period, axis: 2, where });

/** Short vertical streaks, like a buzzard's or young eagle's breast. */
export const streaked = (color, { density = 0.35, where } = {}) =>
  gate(where, (c, { i, j, face: f, cube }) => {
    const col = i + cube.origin[0] * 7 + ['front', 'left', 'right', 'back', 'top', 'bottom'].indexOf(f) * 31;
    return hash(col, Math.floor(j / 2), 5) < density && j % 2 === 0 ? hex(color) : c;
  });

/** Scattered pale or dark spots (owls, the snowy owl's black flecks). */
export const flecked = (color, { density = 0.12, where } = {}) =>
  gate(where, (c, { p }) => (hash(Math.floor(p[0] * 2), Math.floor(p[1] * 2), Math.floor(p[2] * 2)) < density ? hex(color) : c));

/** Pale edges on the wing coverts: a scaly look. */
export const scaled = (amount = 0.2, { where } = {}) =>
  gate(where, (c, { i, j }) => ((i + (j >> 1)) % 3 === 0 && j % 2 === 0 ? shade(c, 1 + amount) : c));

export { all, bone, face };
export { region, mottle, underside, gradient } from './texture.mjs';
export const front = face('front');
export const breast = all(bone('body'), face('front', 'bottom'));

/**
 * A bird spec with the shared defaults filled in.
 * spec.body: options for bodies.mjs raptor(); spec.motion: options for anim.mjs raptor().
 */
export function bird(spec) {
  const owl = spec.group === 'owl';
  // The perched bird shows its belly (the body's bottom face) as its chest: don't shade it dark.
  const mat = (m) => (typeof m === 'string' ? { base: m } : m);
  const bodyMat = { shading: 0.04, ...mat(spec.materials.body) };
  const model = body({ ...(spec.body ?? {}), eyes: owl ? 'front' : 'side', hood: !!spec.falconry });
  return {
    family: [],
    health: 12,
    speed: 0.2,
    xp: 3,
    sleeps: owl ? 'day' : 'night',
    ...spec,
    model: { bones: model.bones },
    materials: { ...commonMaterials, neck: spec.materials.head, ...spec.materials, body: bodyMat },
    anims: anims({ owl, lean: model.lean, walker: spec.movement === 'walk', ...(spec.motion ?? {}) }),
  };
}
