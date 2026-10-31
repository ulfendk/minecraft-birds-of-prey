// Bird spec -> Bedrock resource-pack files (client entity, render controller,
// animation controllers, sound mappings).
import { NS } from './constants.mjs';

const anim = (id, name) => `animation.${NS}.${id}.${name}`;

/**
 * Posture states, by priority. The Java edition picks the same states from the same
 * conditions (dk.ulfen.birds.entity.Raptor#pickMove), so keep the two in step.
 *   stoop: diving steeply   hover: flapping on the spot   glide: soaring, not climbing
 */
export function moveStates(a) {
  const air = '!query.is_on_ground && !query.is_in_water';
  return [
    { name: 'sleeping', anim: 'sleep', cond: 'query.is_sleeping' },
    { name: 'stooping', anim: 'stoop', cond: `${air} && query.vertical_speed < -7` },
    { name: 'hovering', anim: 'hover', cond: `${air} && query.ground_speed < ${a.hovers ? 2.5 : 0.8}` },
    { name: 'gliding', anim: 'glide', cond: `${air} && query.vertical_speed < ${a.soars ? 0.6 : -0.6}` },
    { name: 'flying', anim: 'fly', cond: air },
    { name: 'eating', anim: 'eat', cond: `query.property('${NS}:carrying') && query.is_on_ground` },
    { name: 'walking', anim: 'walk', cond: 'query.ground_speed > 0.4' },
  ];
}

function moveController(a, available) {
  const candidates = moveStates(a).filter((s) => available.has(s.anim));
  const states = {
    default: {
      animations: ['idle'],
      transitions: candidates.map((s) => ({ [s.name]: s.cond })),
      blend_transition: 0.2,
    },
  };
  candidates.forEach((s, i) => {
    states[s.name] = {
      animations: [s.anim],
      transitions: [...candidates.slice(0, i).map((o) => ({ [o.name]: o.cond })), { default: `!(${s.cond})` }],
      blend_transition: 0.25,
    };
  });
  return { initial_state: 'default', states };
}

export function buildAnimationControllers(a, animNames) {
  const available = new Set(animNames);
  return {
    format_version: '1.10.0',
    animation_controllers: {
      [`controller.animation.${NS}.${a.id}.move`]: moveController(a, available),
      [`controller.animation.${NS}.${a.id}.attack`]: {
        initial_state: 'default',
        states: {
          default: { transitions: [{ attacking: 'variable.attack_time > 0' }] },
          attacking: { animations: ['attack'], transitions: [{ default: 'query.all_animations_finished' }] },
        },
      },
    },
  };
}

export function buildClientEntity(a, animNames) {
  const animations = Object.fromEntries(animNames.map((n) => [n, anim(a.id, n)]));
  animations.look_at_target = `animation.${NS}.common.look_at_target`;
  animations.move_controller = `controller.animation.${NS}.${a.id}.move`;
  animations.attack_controller = `controller.animation.${NS}.${a.id}.attack`;
  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${a.id}`,
        materials: { default: 'entity_alphatest' },
        textures: { default: `textures/entity/${NS}/${a.id}` },
        geometry: { default: `geometry.${NS}.${a.id}` },
        animations,
        scripts: {
          animate: ['move_controller', 'attack_controller', { look_at_target: '!query.is_sleeping' }],
          ...(a.scale && a.scale !== 1 ? { scale: String(a.scale) } : {}),
        },
        render_controllers: [`controller.render.${NS}.${a.id}`],
        spawn_egg: { base_color: a.egg[0], overlay_color: a.egg[1] },
        enable_attachables: false,
      },
    },
  };
}

export function buildRenderController(a, boneNames) {
  const vis = [{ prey: `query.property('${NS}:carrying')` }];
  if (boneNames.includes('hood')) vis.push({ hood: `query.property('${NS}:hooded')` });
  return {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.${a.id}`]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default'],
        part_visibility: [{ '*': true }, ...vis],
      },
    },
  };
}

/** Entity sound events mapped onto vanilla sounds with a per-species pitch. */
export function buildEntitySounds(a) {
  const s = a.sounds ?? {};
  const events = {};
  for (const key of ['ambient', 'hurt', 'death', 'attack']) if (s[key]) events[key] = s[key];
  return { volume: s.volume ?? 1.0, pitch: s.pitch ?? [0.9, 1.1], events };
}
