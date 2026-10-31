import { GameMode, ItemStack, world } from '@minecraft/server';

export const NS = 'birds';
export const speciesOf = (entity) => (entity?.typeId?.startsWith(`${NS}:`) ? entity.typeId.slice(NS.length + 1) : null);

/** All entities of a type (or family) near at least one player (cheap enough to poll). */
export function nearPlayers(query, radius = 48) {
  const out = new Map();
  for (const player of world.getPlayers()) {
    let found;
    try {
      found = player.dimension.getEntities({ ...query, location: player.location, maxDistance: radius });
    } catch {
      continue;
    }
    for (const e of found) out.set(e.id, e);
  }
  return [...out.values()];
}

export const chance = (p) => Math.random() < p;

export function isBaby(entity) {
  try {
    return !!entity.getComponent('minecraft:is_baby');
  } catch {
    return false;
  }
}

/** The player id a trained bird belongs to, or undefined for a wild one. */
export function ownerId(entity) {
  try {
    const t = entity.getComponent('minecraft:tameable');
    if (t?.isTamed) return t.tamedToPlayerId;
    return entity.getComponent('minecraft:is_tamed') ? entity.getDynamicProperty(`${NS}:owner`) : undefined;
  } catch {
    return undefined;
  }
}

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Per-entity cooldowns kept in memory (they reset when the world reloads, which is fine). */
const cooldowns = new Map();
export function ready(entity, key, ticks, now) {
  const k = `${entity.id}:${key}`;
  if (now < (cooldowns.get(k) ?? 0)) return false;
  cooldowns.set(k, now + ticks);
  return true;
}

export const say = (player, key, ...args) => player.onScreenDisplay.setActionBar({ translate: `${NS}.${key}`, with: args.map(String) });
export const tell = (player, key, ...args) => player.sendMessage({ translate: `${NS}.${key}`, with: args.map(String) });
/** A translated bird name, for use inside another message. */
export const birdName = (id) => ({ translate: `entity.${NS}:${id}.name` });
export const sayWith = (player, key, rawArgs) => player.onScreenDisplay.setActionBar({ translate: `${NS}.${key}`, with: { rawtext: rawArgs } });
export const tellWith = (player, key, rawArgs) => player.sendMessage({ translate: `${NS}.${key}`, with: { rawtext: rawArgs } });

export const held = (player) => player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
export function setHeld(player, item) {
  player.getComponent('minecraft:inventory')?.container?.setItem(player.selectedSlotIndex, item);
}

/** Use up one of the held item, unless the player is in creative. */
export function consumeHeld(player) {
  if (player.getGameMode() === GameMode.Creative) return;
  const item = held(player);
  if (!item) return;
  if (item.amount > 1) {
    item.amount -= 1;
    setHeld(player, item);
  } else setHeld(player, undefined);
}

export function give(player, item) {
  const left = player.getComponent('minecraft:inventory')?.container?.addItem(item);
  if (left) player.dimension.spawnItem(left, player.location);
}

export const stack = (id, amount = 1) => new ItemStack(id, amount);
