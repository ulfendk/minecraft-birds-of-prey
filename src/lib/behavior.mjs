// Bird spec -> Bedrock behavior-pack files (entity, spawn rules, loot table).
import { NS } from './constants.mjs';

const fam = (value) => ({ test: 'is_family', subject: 'other', value });
const anyFamily = (list) => (list.length === 1 ? fam(list[0]) : { any_of: list.map(fam) });

/** Our habitat names -> Bedrock biome tags (any of them matches). */
export const BIOME_TAGS = {
  mountains: ['mountains', 'extreme_hills'],
  meadow: ['meadow'],
  snowy: ['frozen'],
  taiga: ['taiga'],
  forest: ['forest'],
  dark_forest: ['roofed'],
  plains: ['plains'],
  swamp: ['swamp'],
  river: ['river'],
  beach: ['beach', 'stone_beach'],
  savanna: ['savanna'],
  desert: ['desert'],
  mesa: ['mesa'],
  jungle: ['jungle'],
};

/** Raw meat a falconer can feed (taming and healing). */
export const MEAT = ['rabbit', 'chicken', 'beef', 'mutton', 'porkchop'];

/** Prefix vanilla items with minecraft: and our own with the namespace. */
export const itemId = (name) => (name.includes(':') ? name : `minecraft:${name}`);

/** Wild birds keep their distance from players who walk up to them (sneak, or sit in a bird hide). */
function wary(a) {
  return {
    filters: { all_of: [
      fam('player'),
      { test: 'is_sneaking', subject: 'other', value: false },
      { test: 'has_tag', subject: 'other', operator: '!=', value: `${NS}_hidden` },
    ] },
    max_dist: a.shy ?? 10,
    walk_speed_multiplier: 1.2,
    sprint_speed_multiplier: 1.5,
  };
}

function baseComponents(a) {
  const c = {
    'minecraft:is_hidden_when_invisible': {},
    'minecraft:type_family': { family: [a.id, NS, 'bird', 'raptor', ...(a.family ?? []), 'mob'] },
    'minecraft:collision_box': { width: hitbox(a)[0], height: hitbox(a)[1] },
    'minecraft:health': { value: a.health, max: a.health },
    'minecraft:movement': { value: a.speed },
    'minecraft:jump.static': {},
    'minecraft:nameable': {},
    'minecraft:physics': {},
    'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: true },
    'minecraft:leashable': {},
    'minecraft:balloonable': { mass: 0.5 },
    'minecraft:conditional_bandwidth_optimization': {},
    'minecraft:damage_sensor': { triggers: [{ cause: 'fall', deals_damage: 'no' }] },
    'minecraft:breathable': { total_supply: 15, suffocate_time: 0 },
    'minecraft:hurt_on_condition': {
      damage_conditions: [{ filters: { test: 'in_lava', subject: 'self' }, cause: 'lava', damage_per_tick: 4 }],
    },
    'minecraft:behavior.float': { priority: 0 },
    'minecraft:behavior.random_look_around': { priority: 10 },
    'minecraft:behavior.look_at_player': { priority: 9, look_distance: 8, probability: 0.02 },
  };
  if (a.sounds?.ambient) {
    c['minecraft:ambient_sound_interval'] = { event_name: 'ambient', range: 16, value: a.sounds.interval ?? 12 };
  }

  if (a.movement === 'walk') {
    // The secretary bird strides through the grass and only flaps up when it has to.
    Object.assign(c, {
      'minecraft:movement.basic': {},
      'minecraft:navigation.walk': { can_path_over_water: true, avoid_water: true, avoid_damage_blocks: true },
      'minecraft:behavior.random_stroll': { priority: 8, speed_multiplier: 0.8, xz_dist: 12 },
    });
  } else {
    Object.assign(c, {
      'minecraft:movement.fly': {},
      'minecraft:flying_speed': { value: a.flySpeed ?? 0.2 },
      'minecraft:can_fly': {},
      'minecraft:navigation.fly': { can_path_from_air: true, can_path_over_water: true, avoid_damage_blocks: true },
      'minecraft:behavior.random_fly': {
        priority: 8, can_land_on_trees: true, avoid_damage_blocks: true,
        xz_dist: a.range ?? 24, y_dist: a.soars ? 14 : 8, y_offset: a.soars ? 6 : 2, speed_multiplier: 1.0,
      },
    });
  }

  if (a.fleesFrom?.length) {
    c['minecraft:behavior.avoid_mob_type'] = {
      priority: 3, remove_target: true,
      entity_types: [{ filters: anyFamily(a.fleesFrom), max_dist: 12, walk_speed_multiplier: 1.3, sprint_speed_multiplier: 1.6 }],
    };
  }

  c['minecraft:attack'] = { damage: a.attack.damage };
  c['minecraft:behavior.melee_box_attack'] = { priority: 3, speed_multiplier: a.attack.speed ?? 1.5, track_target: true, cooldown_time: a.attack.cooldown ?? 1.0 };
  c['minecraft:behavior.hurt_by_target'] = { priority: 1, alert_same_type: !!a.alertsPack, hurt_owner: false };

  const food = a.heal ?? MEAT;
  c['minecraft:healable'] = { items: food.map((item) => ({ item: itemId(item), heal_amount: 4 })) };

  // Owls cough up pellets of fur and bones now and then.
  if (a.pellets) {
    c['minecraft:spawn_entity'] = { entities: { min_wait_time: 600, max_wait_time: 1200, spawn_sound: 'plop', spawn_item: `${NS}:owl_pellet`, filters: { test: 'is_baby', subject: 'self', operator: '!=', value: true } } };
  }
  return c;
}

/** Component groups: baby/adult, wild/tamed (falconry), the day/night schedule. */
function lifeGroups(a) {
  const breedItems = (a.breed ?? MEAT).map(itemId);
  const groups = {
    // Wild birds come and go; trained and ringed ones stay (scripts/ringing.js, falconry).
    [`${NS}:despawns`]: { 'minecraft:despawn': { despawn_from_distance: {} } },
    [`${NS}:baby`]: {
      'minecraft:is_baby': {},
      'minecraft:scale': { value: 0.5 },
      'minecraft:ageable': { duration: 1200, feed_items: breedItems.map((item) => ({ item, growth: 0.1 })), grow_up: { event: `${NS}:grow_up`, target: 'self' } },
      'minecraft:behavior.follow_parent': { priority: 5, speed_multiplier: 1.1 },
    },
    [`${NS}:adult`]: {
      'minecraft:experience_reward': { on_bred: 'Math.Random(1,7)', on_death: `query.last_hit_by_player ? Math.Random(1,${a.xp ?? 3}) : 0` },
      'minecraft:loot': { table: `loot_tables/entities/${NS}_${a.id}.json` },
      'minecraft:breedable': {
        require_tame: false,
        breeds_with: { mate_type: `${NS}:${a.id}`, baby_type: `${NS}:${a.id}`, breed_event: { event: `${NS}:entity_born`, target: 'baby' } },
        breed_items: breedItems,
      },
      'minecraft:behavior.breed': { priority: 2, speed_multiplier: 1.0 },
    },
    // Wild: shy of people, and tameable with raw meat if it's a falconry bird.
    [`${NS}:wild`]: {
      'minecraft:behavior.avoid_mob_type': { priority: 2, remove_target: false, entity_types: [wary(a)] },
      ...(a.hunts?.length ? {
        // Wild birds hunt on their own; a trained bird only goes after what its falconer sends it at.
        'minecraft:behavior.nearest_attackable_target': {
          priority: 5, must_see: true, reselect_targets: true, attack_interval: a.huntInterval ?? 30,
          entity_types: [{
            filters: { all_of: [anyFamily(a.hunts), { test: 'is_family', subject: 'other', operator: '!=', value: 'player' }] },
            max_dist: a.huntRange ?? 24,
          }],
        },
      } : {}),
      ...(a.falconry ? {
        'minecraft:tameable': {
          probability: a.falconry.chance ?? 0.25,
          tame_items: MEAT.map(itemId),
          tame_event: { event: `${NS}:on_tame`, target: 'self' },
        },
      } : {}),
    },
  };
  if (a.falconry) {
    groups[`${NS}:tamed`] = {
      'minecraft:is_tamed': {},
      'minecraft:sittable': {},
      'minecraft:behavior.follow_owner': { priority: 4, speed_multiplier: 1.4, start_distance: 12, stop_distance: 4, can_teleport: true },
      'minecraft:behavior.owner_hurt_by_target': { priority: 1 },
      'minecraft:behavior.owner_hurt_target': { priority: 2 },
      // Released from the glove at something the falconer was looking at (scripts/falconry.js tags it).
      'minecraft:behavior.nearest_attackable_target': {
        priority: 1, must_see: false, reselect_targets: true, within_radius: 64,
        entity_types: [{ filters: { test: 'has_tag', subject: 'other', value: `${NS}_quarry` }, max_dist: 64 }],
      },
      'minecraft:behavior.stay_while_sitting': { priority: 0 },
    };
    // Hooded: calm and still on its perch until the hood comes off.
    groups[`${NS}:hooded`] = {
      'minecraft:movement': { value: 0 },
      'minecraft:flying_speed': { value: 0 },
      'minecraft:behavior.nearest_attackable_target': { priority: 1, entity_types: [{ filters: { test: 'is_family', subject: 'other', value: 'nothing' } }] },
    };
  }

  // Resting hours: roosting (shown with the sleep animation).
  const active = {};
  const resting = {};
  resting['minecraft:behavior.nap'] = {
    priority: 6, cooldown_min: 4, cooldown_max: 12, mob_detect_dist: 10, mob_detect_height: 4,
    can_nap_filters: { all_of: [
      { test: 'in_water', subject: 'self', operator: '==', value: false },
      { test: 'on_ground', subject: 'self', operator: '==', value: true },
      { test: 'has_target', subject: 'self', operator: '==', value: false },
    ] },
    wake_mob_exceptions: { any_of: [fam(a.id), { test: 'is_sneaking', subject: 'other', operator: '==', value: true }] },
  };
  groups[`${NS}:active`] = active;
  groups[`${NS}:resting`] = resting;
  return groups;
}

/** Collision size after the species' size multiplier. */
export function hitbox(a) {
  const k = a.scale ?? 1;
  const r = (v) => Math.round(v * 100) / 100;
  return [r(a.size[0] * k), r(a.size[1] * k)];
}

export function buildEntity(a) {
  const components = baseComponents(a);
  const groups = lifeGroups(a);
  const properties = {
    [`${NS}:carrying`]: { type: 'bool', default: false, client_sync: true },
    ...(a.falconry ? { [`${NS}:hooded`]: { type: 'bool', default: false, client_sync: true } } : {}),
  };

  // Owls hunt at night and roost by day.
  const activeByDay = a.sleeps !== 'day';
  components['minecraft:environment_sensor'] = {
    triggers: [
      { filters: { test: 'is_daytime', value: activeByDay }, event: `${NS}:become_active` },
      { filters: { test: 'is_daytime', value: !activeByDay }, event: `${NS}:become_resting` },
    ],
  };

  const adult = [`${NS}:adult`, `${NS}:wild`];
  const events = {
    'minecraft:entity_spawned': {
      sequence: [
        { randomize: [{ weight: 90, add: { component_groups: adult } }, { weight: 10, add: { component_groups: [`${NS}:baby`, `${NS}:wild`] } }] },
        { add: { component_groups: [`${NS}:active`, `${NS}:despawns`] } },
      ],
    },
    [`${NS}:entity_born`]: { add: { component_groups: [`${NS}:baby`, `${NS}:wild`, `${NS}:active`, `${NS}:despawns`] } },
    [`${NS}:ringed`]: { remove: { component_groups: [`${NS}:despawns`] } },
    [`${NS}:spawn_adult`]: { add: { component_groups: [...adult, `${NS}:active`, `${NS}:despawns`] } },
    [`${NS}:grow_up`]: { remove: { component_groups: [`${NS}:baby`] }, add: { component_groups: [`${NS}:adult`] } },
    [`${NS}:become_active`]: { remove: { component_groups: [`${NS}:resting`] }, add: { component_groups: [`${NS}:active`] } },
    [`${NS}:become_resting`]: { remove: { component_groups: [`${NS}:active`] }, add: { component_groups: [`${NS}:resting`] } },
    [`${NS}:start_carrying`]: { set_property: { [`${NS}:carrying`]: true } },
    [`${NS}:stop_carrying`]: { set_property: { [`${NS}:carrying`]: false } },
  };
  if (a.falconry) {
    Object.assign(events, {
      [`${NS}:on_tame`]: { remove: { component_groups: [`${NS}:wild`, `${NS}:despawns`] }, add: { component_groups: [`${NS}:tamed`] } },
      // A trained bird released from the glove (scripts/falconry.js tames it to the falconer).
      [`${NS}:spawn_tame`]: { add: { component_groups: [...adult, `${NS}:active`] } },
      [`${NS}:hood`]: { add: { component_groups: [`${NS}:hooded`] }, set_property: { [`${NS}:hooded`]: true } },
      [`${NS}:unhood`]: { remove: { component_groups: [`${NS}:hooded`] }, set_property: { [`${NS}:hooded`]: false } },
    });
  }

  return {
    format_version: '1.21.120',
    'minecraft:entity': {
      description: {
        identifier: `${NS}:${a.id}`,
        spawn_category: 'creature',
        is_spawnable: true,
        is_summonable: true,
        properties,
      },
      component_groups: groups,
      components,
      events,
    },
  };
}

export function buildSpawnRules(a) {
  const conditions = (a.spawn ?? []).map((s) => {
    const tags = s.biomes.flatMap((b) => BIOME_TAGS[b] ?? [b]).map((value) => ({ test: 'has_biome_tag', operator: '==', value }));
    return {
      'minecraft:spawns_on_surface': {},
      ...(s.blocks ? { 'minecraft:spawns_on_block_filter': s.blocks.map(itemId) } : {}),
      'minecraft:brightness_filter': { min: a.sleeps === 'day' ? 0 : 7, max: 15, adjust_for_weather: false },
      'minecraft:weight': { default: s.weight ?? 3 },
      'minecraft:herd': { min_size: s.group?.[0] ?? 1, max_size: s.group?.[1] ?? 1 },
      'minecraft:density_limit': { surface: s.density ?? 2 },
      'minecraft:biome_filter': tags.length === 1 ? tags[0] : { any_of: tags },
    };
  });
  return {
    format_version: '1.8.0',
    'minecraft:spawn_rules': { description: { identifier: `${NS}:${a.id}`, population_control: 'animal' }, conditions },
  };
}

export function buildLoot(a) {
  const pools = (a.loot ?? [{ item: 'feather', min: 1, max: 3 }]).map((l) => ({
    rolls: 1,
    ...(l.chance ? { conditions: [{ condition: 'random_chance_with_looting', chance: l.chance, looting_multiplier: 0.05 }] } : {}),
    entries: [{ type: 'item', name: itemId(l.item), weight: 1, functions: [
      { function: 'set_count', count: { min: l.min ?? 0, max: l.max ?? 1 } },
      { function: 'looting_enchant', count: { min: 0, max: 1 } },
    ] }],
  }));
  return { pools };
}
