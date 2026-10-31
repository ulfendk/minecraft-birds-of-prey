// Keyframed animation templates for birds of prey. Everything is plain keyframes
// (no Molang), so the files are portable to GeckoLib for the Java edition.
//
// Rotation convention (Bedrock): +x pitches a bone's front (-z) downwards and
// swings a hanging leg backwards; +z rolls towards the animal's right.
// A folded wing hangs down along the body; rolling it by ~80 degrees spreads it.

const r = (n) => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;

/** Sample f(phase in [0,1)) into n keyframes over `length` seconds (looping). */
function cycle(length, n, f) {
  const out = {};
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * length;
    out[r(t).toFixed(2)] = f((k % n) / n).map(r);
  }
  return out;
}

const sin = (phase, offset = 0) => Math.sin((phase + offset) * TAU);

/** Merge bone channels (later wins per channel). */
function bones(...parts) {
  const out = {};
  for (const p of parts) {
    for (const [bone, channels] of Object.entries(p)) {
      if (!bone || bone === 'undefined') continue;
      out[bone] = { ...(out[bone] ?? {}), ...channels };
    }
  }
  return out;
}

const loop = (length, b) => ({ loop: true, animation_length: length, bones: b });
const once = (length, b) => ({ animation_length: length, bones: b });
const hold = (b) => ({ loop: true, bones: b });

/**
 * Birds of prey. The model's rest pose is perched (see bodies.mjs): rotations here are
 * added to it, so flight rotates the body level again (-lean) and unfolds the wings.
 * opts: lean (the model's perched pitch), span (wing dihedral in flight, degrees above level),
 *       flap (flap amplitude), flapLength, owl (head swivels), walker (secretary bird).
 */
export function raptor(o = {}) {
  const lean = o.lean ?? -55;
  const flap = o.flap ?? 25;
  const flapLen = o.flapLength ?? 0.6;
  const dihedral = o.span ?? 5;
  const n = 8;
  const stride = o.walker ? 40 : 30;

  // Unfold by `open` (0 folded .. 1 spread) and flap: z rolls the spread wing up and down.
  const wings = (len, amp, open = 1, base = dihedral, phase = 0) => ({
    wing_l: { rotation: cycle(len, n, (p) => [0, 90 * open, 90 * open - (base + amp * sin(p, phase))]) },
    wing_r: { rotation: cycle(len, n, (p) => [0, -90 * open, -90 * open + (base + amp * sin(p, phase))]) },
  });
  // Body pitched to `pitch` (0 = level, negative = chest up), head kept level.
  const pose = (pitch) => ({
    body: { rotation: [pitch - lean, 0, 0] },
    neck: { rotation: [lean - pitch, 0, 0] },
  });
  const tucked = { leg_l: { rotation: [75, 0, 0] }, leg_r: { rotation: [75, 0, 0] } };
  const legs = (len, amp) => ({
    leg_l: { rotation: cycle(len, n, (p) => [amp * sin(p), 0, 0]) },
    leg_r: { rotation: cycle(len, n, (p) => [amp * sin(p, 0.5), 0, 0]) },
  });
  const walkLen = o.walker ? 1.0 : 0.6;

  return {
    walk: loop(walkLen, bones(
      legs(walkLen, stride),
      o.walker ? pose(-20) : {},
      { head: { rotation: cycle(walkLen, n, (p) => [4 * sin(p * 2), 0, 0]) } },
    )),
    idle: o.owl
      // Owls swivel their heads right round, then back.
      ? loop(6, bones({ head: { rotation: { '0.0': [0, 0, 0], '1.5': [0, 0, 0], '2.2': [0, 110, 0], '3.4': [0, 110, 0], '4.0': [0, -60, 0], '5.0': [0, -60, 0], '6.0': [0, 0, 0] } } }))
      : loop(4, bones({ head: { rotation: { '0.0': [0, 0, 0], '0.6': [0, 30, 0], '1.4': [0, 30, 0], '1.8': [-8, -20, 0], '2.8': [-8, -20, 0], '3.3': [0, 0, 8], '4.0': [0, 0, 0] } } })),
    fly: loop(flapLen, bones(pose(0), tucked, wings(flapLen, flap))),
    // Soaring on outstretched wings, rocking a little.
    glide: loop(3, bones(pose(0), tucked, wings(3, 2, 1, dihedral + 3), { root: { rotation: cycle(3, n, (p) => [0, 0, 5 * sin(p)]) } })),
    // Hovering into the wind (kestrel): body steep, fast shallow beats, tail fanned down.
    hover: loop(0.3, bones(pose(-40), tucked, wings(0.3, flap * 0.8, 1, 0), { tail: { rotation: [-25, 0, 0] } })),
    // The stoop: wings half tucked, head first.
    stoop: hold(bones(pose(40), tucked, {
      wing_l: { rotation: [0, 55, 55] },
      wing_r: { rotation: [0, -55, -55] },
    })),
    // Strike: talons thrown forward, wings flared.
    attack: once(0.5, bones({
      leg_l: { rotation: { '0.0': [0, 0, 0], '0.15': [-70, 0, 0], '0.35': [-50, 0, 0], '0.5': [0, 0, 0] } },
      leg_r: { rotation: { '0.0': [0, 0, 0], '0.15': [-70, 0, 0], '0.35': [-50, 0, 0], '0.5': [0, 0, 0] } },
      wing_l: { rotation: { '0.0': [0, 0, 0], '0.15': [0, 80, 40], '0.4': [0, 40, 30], '0.5': [0, 0, 0] } },
      wing_r: { rotation: { '0.0': [0, 0, 0], '0.15': [0, -80, -40], '0.4': [0, -40, -30], '0.5': [0, 0, 0] } },
      head: { rotation: { '0.0': [0, 0, 0], '0.2': [-15, 0, 0], '0.4': [25, 0, 0], '0.5': [0, 0, 0] } },
    })),
    ...(o.walker ? {
      // Secretary bird: a hard downward stamp of one foot.
      stamp: once(0.6, bones({
        leg_r: { rotation: { '0.0': [0, 0, 0], '0.2': [-60, 0, 0], '0.3': [10, 0, 0], '0.6': [0, 0, 0] } },
        wing_l: { rotation: { '0.0': [0, 0, 0], '0.2': [0, 60, 40], '0.6': [0, 0, 0] } },
        wing_r: { rotation: { '0.0': [0, 0, 0], '0.2': [0, -60, -40], '0.6': [0, 0, 0] } },
        head: { rotation: { '0.0': [0, 0, 0], '0.3': [35, 0, 0], '0.6': [0, 0, 0] } },
      })),
    } : {}),
    // Tearing at food on the ground, wings mantled over it.
    eat: loop(1.2, bones(
      pose(-15),
      { head: { rotation: cycle(1.2, n, (p) => [45 + 12 * sin(p * 2), 0, 0]) } },
      wings(1.2, 3, 0.35, 0),
    )),
    // Roosting: fluffed up, head turned back into the shoulder feathers.
    sleep: hold(bones(
      { root: { position: [0, -1, 0] } },
      { head: { rotation: o.owl ? [20, 0, 0] : [10, 160, 0] } },
    )),
    // Calling: head thrown back, wings loosened (played by scripts now and then).
    call: once(1.0, bones({
      head: { rotation: { '0.0': [0, 0, 0], '0.2': [-35, 0, 0], '0.7': [-35, 0, 0], '1.0': [0, 0, 0] } },
      wing_l: { rotation: { '0.0': [0, 0, 0], '0.3': [0, 20, 20], '0.7': [0, 20, 20], '1.0': [0, 0, 0] } },
      wing_r: { rotation: { '0.0': [0, 0, 0], '0.3': [0, -20, -20], '0.7': [0, -20, -20], '1.0': [0, 0, 0] } },
    })),
  };
}

/** Wrap per-species animations into a Bedrock animation file. */
export function animationFile(id, anims, ns = 'birds') {
  const out = {};
  for (const [name, a] of Object.entries(anims)) out[`animation.${ns}.${id}.${name}`] = a;
  return { format_version: '1.8.0', animations: out };
}
