// Body builder for birds of prey. Every species is the same kind of bird with
// different proportions, so one parametrised skeleton covers eagles, falcons,
// hawks, owls, vultures and the long-legged secretary bird.
//
// The geometry is the bird in flight: body level, wings spread. The bones' rest
// rotations fold it into a perched bird (body upright, wings folded along the flanks),
// and the flight animations rotate it back (see anim.mjs).
//
// Bones: root > leg_l, leg_r, prey; root > body > wing_l, wing_r, tail, neck > head > hood.
// Materials: body, wing, primaries, tail, neck, head, cere, beak, legs, foot, talon,
// plus tufts / crest / ruff when used, hood + plume for falconry birds and prey for the catch.

/** Rest rotation of a folded wing: span -> backwards, chord -> downwards, flat against the flank. */
export const FOLD = { wing_l: [0, -90, -90], wing_r: [0, 90, 90] };

/**
 * opts (all in pixels, 16 per block):
 *   bodyW, bodyH, bodyL   body box (level, as in flight)
 *   lean                  perched pitch in degrees (negative: chest up)
 *   tarsus, thigh         bare leg and feathered "trousers"
 *   neck                  neck length (0 for owls)
 *   headW, headH, headD   head box
 *   beak                  beak length, hook: false for a straight bill
 *   wingL, wingD, tip     half-span, chord and how much of it is primaries
 *   tailL, tailW, fork    tail; fork splits it (kites)
 *   eyes                  'side' (hawks, eagles) | 'front' (owls); eye, pupil, ring colours
 *   tufts, crest, ruff    ear tufts (eagle-owl), quill crest (secretary bird), collar (condor)
 *   hood                  falconry hood bone (tameable species)
 *   marks                 extra head marks [{ face, x, y, w?, h?, color }]
 */
export function raptor(o) {
  const {
    bodyW = 5, bodyH = 5, bodyL = 9, lean = -55,
    tarsus = 3, thigh = 2, neck = 1,
    headW = 4, headH = 4, headD = 4, beak = 1, hook = true,
    wingL = 10, wingD = 6, tip = 4,
    tailL = 6, tailW = 4, fork = false,
    eyes = 'side', eye = '#14100c', pupil, ring,
    tufts = false, crest = false, ruff = false, hood = false, marks = [],
  } = o;

  const hip = tarsus + thigh;
  const y0 = hip; // body bottom
  const top = y0 + bodyH;
  const cy = y0 + bodyH / 2;
  const x = bodyW / 2;
  const z0 = -bodyL / 2; // front of the body
  const z1 = bodyL / 2; // back

  const leg = (name, side) => {
    const lx = side > 0 ? 0.5 : -2.5;
    return {
      name, parent: 'root', pivot: [lx + 1, hip, 0],
      cubes: [
        { origin: [lx, tarsus, -1], size: [2, thigh + 1, 2], mat: 'legs' },
        { origin: [lx + 0.5, 0, -0.5], size: [1, tarsus, 1], mat: 'foot' },
        { origin: [lx, 0, -2], size: [2, 1, 2], mat: 'foot' },
        { origin: [lx, 0, -3], size: [2, 1, 1], mat: 'talon' },
      ],
    };
  };

  // Spread wings; the rest rotation folds them.
  const wz = z0 + 1;
  const wing = (name, side) => {
    const inner = wingL - tip;
    const wx = side > 0 ? x : -x - wingL;
    const tx = side > 0 ? x + inner : -x - wingL;
    const ix = side > 0 ? x : -x - inner;
    return {
      name, parent: 'body', pivot: [side * x, top, wz], rotation: FOLD[name],
      cubes: [
        { origin: [ix, top - 1, wz], size: [inner, 1, wingD], mat: 'wing' },
        { origin: [tx, top - 1, wz + 1], size: [tip, 1, wingD - 1], mat: 'primaries' },
      ],
    };
  };

  const tailCubes = fork
    ? [
      { origin: [-tailW / 2, top - 1, z1 - 1], size: [tailW, 1, tailL - 2], mat: 'tail' },
      { origin: [-tailW / 2, top - 1, z1 + tailL - 3], size: [1, 1, 3], mat: 'tail' },
      { origin: [tailW / 2 - 1, top - 1, z1 + tailL - 3], size: [1, 1, 3], mat: 'tail' },
    ]
    : [{ origin: [-tailW / 2, top - 1, z1 - 1], size: [tailW, 1, tailL], mat: 'tail' }];

  // Neck and head in front of the body (owls: the head sits right on it).
  const neckZ = z0 - neck;
  const hz = neckZ - headD + 1; // head front
  const hy = top - headH + 1 + (eyes === 'front' ? 1 : 0);
  const beakY = hy + Math.floor(headH / 2) - 1;
  const headMarks = [...marks];
  if (eyes === 'front') {
    const gap = headW >= 6 ? 1 : 0;
    const lx = Math.floor((headW - gap) / 2) - 2;
    const rx = Math.ceil((headW + gap) / 2);
    for (const ex of [lx, rx]) {
      headMarks.push({ face: 'front', x: ex, y: 1, w: 2, h: 2, color: eye });
      if (pupil) headMarks.push({ face: 'front', x: ex === lx ? ex + 1 : ex, y: 2, color: pupil });
    }
  } else {
    for (const f of ['left', 'right']) {
      const ex = f === 'left' ? 1 : headD - 2;
      if (ring) headMarks.push({ face: f, x: f === 'left' ? ex - 1 : ex, y: 1, w: 2, color: ring });
      headMarks.push({ face: f, x: ex, y: 1, color: eye });
    }
  }

  const headCubes = [
    { origin: [-headW / 2, hy, hz], size: [headW, headH, headD], mat: 'head', marks: headMarks },
    { origin: [-1, beakY, hz - 1], size: [2, 1, 1], mat: 'cere' },
    { origin: [-1, beakY, hz - 1 - beak], size: [2, 1, beak], mat: 'beak' },
  ];
  if (hook) headCubes.push({ origin: [-0.5, beakY - 1, hz - 1 - beak], size: [1, 1, 1], mat: 'beak' });
  if (tufts) {
    headCubes.push({ origin: [-headW / 2, hy + headH, hz + 1], size: [1, 2, 1], mat: 'tufts', rotation: [-10, 0, 15], pivot: [-headW / 2, hy + headH, hz + 1] });
    headCubes.push({ origin: [headW / 2 - 1, hy + headH, hz + 1], size: [1, 2, 1], mat: 'tufts', rotation: [-10, 0, -15], pivot: [headW / 2, hy + headH, hz + 1] });
  }
  if (crest) {
    // Quill-pen feathers sticking out behind the head.
    for (const [i, cx] of [[0, -1.5], [1, 0.5]]) {
      headCubes.push({ origin: [cx, hy + headH - 2 + i, hz + headD], size: [1, 1, 4], mat: 'crest', rotation: [-25 - i * 15, 0, 0], pivot: [cx, hy + headH - 1, hz + headD] });
    }
  }

  const bones = [
    { name: 'root', pivot: [0, 0, 0] },
    {
      name: 'body', parent: 'root', pivot: [0, cy, 0], rotation: [lean, 0, 0],
      cubes: [{ origin: [-x, y0, z0], size: [bodyW, bodyH, bodyL], mat: 'body' }],
    },
    wing('wing_l', 1),
    wing('wing_r', -1),
    { name: 'tail', parent: 'body', pivot: [0, top - 1, z1 - 1], cubes: tailCubes },
    {
      // Counter-rotated so the head stays level on an upright body.
      name: 'neck', parent: 'body', pivot: [0, cy, z0], rotation: [-lean, 0, 0],
      ...(neck > 0 ? { cubes: [{ origin: [-(headW - 1) / 2, top - headH + 1, neckZ], size: [headW - 1, headH - 1, neck + 1], mat: ruff ? 'ruff' : 'neck', ...(ruff ? { inflate: 0.5 } : {}) }] } : {}),
    },
    { name: 'head', parent: 'neck', pivot: [0, hy + headH / 2, hz + headD / 2], cubes: headCubes },
    leg('leg_l', 1),
    leg('leg_r', -1),
    // The catch, held in the talons (shown while carrying).
    { name: 'prey', parent: 'root', pivot: [0, 0, 0], cubes: [{ origin: [-2, 0, -4], size: [4, 2, 3], mat: 'prey' }] },
  ];
  if (hood) {
    bones.push({
      name: 'hood', parent: 'head', pivot: [0, hy, hz + headD / 2],
      cubes: [
        { origin: [-headW / 2, hy + 1, hz], size: [headW, headH - 1, headD], mat: 'hood', inflate: 0.35 },
        { origin: [-0.5, hy + headH, hz + 1], size: [1, 2, 1], mat: 'plume', inflate: 0.1 },
      ],
    });
  }
  return { bones, lean };
}

/** Materials every raptor shares, merged under a species' own. */
export const commonMaterials = {
  hood: '#6b3f22',
  plume: '#c8342a',
  prey: '#7a5a3a',
  talon: '#14100c',
};
