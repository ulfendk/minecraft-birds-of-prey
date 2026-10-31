// Facts derived from bird specs, shared by the website, the lang files and
// the Bird Guide script (which shows them through translation keys).
import { guide } from '../guide.mjs';

export const BIOME_NAMES = {
  mountains: 'Mountains', meadow: 'Meadows', snowy: 'Snowy lands', taiga: 'Taiga', forest: 'Forest',
  dark_forest: 'Dark forest', plains: 'Plains', swamp: 'Swamp', river: 'Rivers', beach: 'Coasts',
  savanna: 'Savanna', desert: 'Desert', mesa: 'Badlands', jungle: 'Jungle',
};

/** Site filters and Bird Guide sections. */
export const GROUPS = { eagle: 'Eagles', falcon: 'Falcons', hawk: 'Hawks and kites', owl: 'Owls', vulture: 'Vultures and others' };

export const TAGS = {
  falconry: 'Falconry bird', nocturnal: 'Active at night', soars: 'Soars', hovers: 'Hovers', stoops: 'Dives at 300 km/h',
  fisher: 'Catches fish', snakes: 'Kills snakes', scavenger: 'Scavenger', bones: 'Drops bones', pellets: 'Coughs up pellets',
  pack: 'Hunts in families', walks: 'Hunts on foot', protected: 'Protected',
};

export function habitatIds(a) {
  return [...new Set((a.spawn ?? []).flatMap((s) => s.biomes))];
}

export function habitats(a) {
  return habitatIds(a).map((b) => BIOME_NAMES[b] ?? b);
}

export function tagIds(a) {
  const t = [];
  if (a.falconry) t.push('falconry');
  if (a.sleeps === 'day') t.push('nocturnal');
  if (a.stoops) t.push('stoops');
  if (a.hovers) t.push('hovers');
  if (a.soars) t.push('soars');
  if ((a.hunts ?? []).includes('fish')) t.push('fisher');
  if ((a.hunts ?? []).includes('venomous_snake')) t.push('snakes');
  if (a.scavenger) t.push('scavenger');
  if (a.dropsBones) t.push('bones');
  if (a.pellets) t.push('pellets');
  if (a.alertsPack) t.push('pack');
  if (a.movement === 'walk') t.push('walks');
  t.push('protected');
  return t;
}

export function tags(a) {
  return tagIds(a).map((id) => TAGS[id]);
}

/** Compact record for the in-game Bird Guide script (texts come from lang keys). */
export function guideEntry(a) {
  return {
    id: a.id,
    name: a.name,
    group: a.group,
    text: guide[a.id] ?? '',
    habitats: habitatIds(a),
    tags: tagIds(a),
    falconry: !!a.falconry,
  };
}
