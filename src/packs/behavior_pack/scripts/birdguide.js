// The Bird Guide: a book that records every bird you've seen, how far away the farthest
// sighting was (through binoculars), and how many birds you've ringed.
import { system, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { ANIMALS } from './data.js';
import { birdName, NS, speciesOf, stack, give } from './util.js';

const SEEN = `${NS}:seen`;
const FAR = `${NS}:farthest`;
const GIVEN = `${NS}:guide_given`;
const GROUP_ORDER = ['eagle', 'falcon', 'hawk', 'owl', 'vulture'];

function load(player, key, fallback) {
  try {
    return JSON.parse(player.getDynamicProperty(key) ?? fallback);
  } catch {
    return JSON.parse(fallback);
  }
}
export const seenSet = (player) => new Set(load(player, SEEN, '[]'));

/** Records a sighting; returns true if the species is new to this player. */
export function recordSighting(player, id, dist = 0) {
  if (!ANIMALS.some((a) => a.id === id)) return false;
  const seen = seenSet(player);
  const isNew = !seen.has(id);
  if (isNew) {
    seen.add(id);
    player.setDynamicProperty(SEEN, JSON.stringify([...seen]));
    player.onScreenDisplay.setActionBar({ translate: `${NS}.guide.spotted`, with: { rawtext: [birdName(id)] } });
    player.playSound('random.orb', { pitch: 1.4 });
    if (seen.size === ANIMALS.length) player.playSound('random.levelup');
  }
  if (dist > 0) {
    const far = load(player, FAR, '{}');
    if (dist > (far[id] ?? 0)) {
      far[id] = Math.round(dist);
      player.setDynamicProperty(FAR, JSON.stringify(far));
    }
  }
  return isNew;
}

/** Every 2 seconds, birds within 10 blocks of a player count as seen. */
function spot() {
  for (const player of world.getPlayers()) {
    let nearby;
    try {
      nearby = player.dimension.getEntities({ families: [NS], location: player.location, maxDistance: 10 });
    } catch {
      continue;
    }
    for (const e of nearby) recordSighting(player, speciesOf(e));
  }
}

const list = (keys) => keys.flatMap((key, i) => (i ? [{ text: ', ' }, { translate: key }] : [{ translate: key }]));
const line = (label, keys) => (keys.length ? [{ text: '\n§2' }, { translate: label }, { text: '§r ' }, ...list(keys)] : []);

function openIndex(player) {
  const seen = seenSet(player);
  const ringed = Number(player.getDynamicProperty(`${NS}:ringed`) ?? 0);
  const form = new ActionFormData()
    .title({ rawtext: [{ translate: `${NS}.guide.title` }, { text: ` (${seen.size}/${ANIMALS.length})` }] })
    .body({ rawtext: [{ translate: `${NS}.guide.intro` }, { text: '\n\n' }, { translate: `${NS}.guide.ringed`, with: [String(ringed)] }] });
  const order = [...ANIMALS].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name));
  for (const a of order) {
    if (seen.has(a.id)) form.button(birdName(a.id), `textures/ui/${NS}/${a.id}`);
    else form.button('§8???');
  }
  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    const a = order[res.selection];
    if (seen.has(a.id)) openEntry(player, a);
    else openIndex(player);
  });
}

function openEntry(player, a) {
  const far = load(player, FAR, '{}')[a.id];
  const body = [
    { translate: `${NS}.guide.entry.${a.id}` },
    { text: '\n' },
    ...line(`${NS}.guide.group`, [`${NS}.group.${a.group}`]),
    ...line(`${NS}.guide.lives_in`, a.habitats.map((h) => `${NS}.habitat.${h}`)),
    ...line(`${NS}.guide.traits`, a.tags.map((t) => `${NS}.tag.${t}`)),
    ...(far ? [{ text: '\n§2' }, { translate: `${NS}.guide.farthest`, with: [String(far)] }] : []),
  ];
  new ActionFormData()
    .title(birdName(a.id))
    .body({ rawtext: body })
    .button({ translate: `${NS}.guide.back` }, `textures/ui/${NS}/${a.id}`)
    .show(player)
    .then((res) => {
      if (!res.canceled) openIndex(player);
    });
}

export function setupBirdGuide() {
  system.runInterval(spot, 40);
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId !== `${NS}:bird_guide`) return;
    source.playSound('item.book.page_turn');
    system.run(() => openIndex(source));
  });
  // Everyone gets a Bird Guide the first time they join a world with the add-on.
  world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
    if (!initialSpawn || player.getDynamicProperty(GIVEN)) return;
    player.setDynamicProperty(GIVEN, true);
    system.runTimeout(() => {
      try {
        give(player, stack(`${NS}:bird_guide`));
        player.sendMessage({ translate: `${NS}.guide.welcome` });
      } catch {
        // Player left before the timeout.
      }
    }, 60);
  });
}
