// Contests for everyone nearby, started with the contest horn: a five-minute falconry
// contest (points for your trained birds' catches) or, blown while sneaking, a bird race
// (points for each species spotted through binoculars, rarer ones worth more).
// The scores are on the sidebar; the winner gets the Golden Raptor trophy.
import { DisplaySlotId, system, world } from '@minecraft/server';
import { SPECIES } from './data.js';
import { birdName, give, NS, stack } from './util.js';

const HORN = `${NS}:contest_horn`;
const OBJECTIVE = `${NS}_contest`;
const MINUTES = 5;
const RANGE = 64;
const TITLES = { falconry: '§6Falconry · Falkejagt', birdrace: '§6Bird Race · Fugleræs' };

/** Points for a falconry catch, by what was caught. */
export function catchPoints(typeId, families = []) {
  const name = typeId.replace(/^minecraft:/, '');
  if (name === 'fox') return 5;
  if (name === 'rabbit') return 3;
  if (name === 'chicken') return 1;
  if (['cod', 'salmon', 'tropicalfish', 'pufferfish'].includes(name) || families.includes('fish')) return 2;
  if (families.includes('monster')) return 4;
  return 2;
}

/** The running contest, or null. Kept in memory: a contest ends if the world is closed. */
let contest = null;

const tellAll = (players, msg) => players.forEach((p) => { try { p.sendMessage(msg); } catch { /* left */ } });
const participants = () => world.getPlayers().filter((p) => contest?.players.has(p.id));

function objective() {
  return world.scoreboard.getObjective(OBJECTIVE);
}

function addPoints(player, points, reason) {
  contest.players.add(player.id);
  objective()?.addScore(player, points);
  player.onScreenDisplay.setActionBar({ translate: `${NS}.contest.points`, with: { rawtext: [{ text: String(points) }, reason] } });
  player.playSound('random.orb', { pitch: 1.8 });
}

/** Called by falconry.js when a trained bird makes a kill. */
export function onCatch(player, typeId, dead) {
  if (contest?.type !== 'falconry') return;
  let families = [];
  try { families = dead.getComponent('minecraft:type_family')?.getTypeFamilies() ?? []; } catch { /* gone */ }
  const key = typeId.startsWith('minecraft:') ? `entity.${typeId.slice(10)}.name` : `entity.${typeId}.name`;
  addPoints(player, catchPoints(typeId, families), { translate: key });
}

/** Called by binoculars.js for every bird a player is looking at. */
export function onSighting(player, id) {
  if (contest?.type !== 'birdrace') return;
  const seen = contest.seen.get(player.id) ?? new Set();
  if (seen.has(id)) return;
  seen.add(id);
  contest.seen.set(player.id, seen);
  addPoints(player, SPECIES[id]?.racePoints ?? 1, birdName(id));
}

function start(player, type) {
  if (contest) {
    player.onScreenDisplay.setActionBar({ translate: `${NS}.contest.running` });
    return;
  }
  try { world.scoreboard.removeObjective(OBJECTIVE); } catch { /* none */ }
  const obj = world.scoreboard.addObjective(OBJECTIVE, TITLES[type]);
  world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective: obj });
  const nearby = player.dimension.getPlayers({ location: player.location, maxDistance: RANGE });
  contest = { type, end: system.currentTick + MINUTES * 1200, players: new Set(nearby.map((p) => p.id)), seen: new Map(), warned: false };
  for (const p of nearby) obj.setScore(p, 0);
  player.dimension.playSound('horn.call.0', player.location, { volume: 4 });
  const name = { translate: `${NS}.contest.${type}` };
  tellAll(nearby, { translate: `${NS}.contest.started`, with: { rawtext: [{ text: player.name }, name, { text: String(MINUTES) }] } });
  tellAll(nearby, { translate: `${NS}.contest.rules_${type}` });
}

function finish() {
  const players = participants();
  const obj = objective();
  const scores = (obj?.getScores() ?? [])
    .map((s) => ({ name: s.participant.displayName, score: s.score, entity: (() => { try { return s.participant.getEntity(); } catch { return undefined; } })() }))
    .sort((a, b) => b.score - a.score);
  tellAll(players, { translate: `${NS}.contest.over`, with: { rawtext: [{ translate: `${NS}.contest.${contest.type}` }] } });
  if (!scores.length || scores[0].score <= 0) {
    tellAll(players, { translate: `${NS}.contest.no_winner` });
  } else {
    const best = scores[0];
    tellAll(players, { translate: `${NS}.contest.winner`, with: [best.name, String(best.score)] });
    scores.slice(0, 3).forEach((s, i) => tellAll(players, { translate: `${NS}.contest.place`, with: [String(i + 1), s.name, String(s.score)] }));
    const winner = world.getPlayers().find((p) => p.name === best.name);
    if (winner) {
      give(winner, stack(`${NS}:golden_raptor`));
      winner.playSound('random.totem');
    }
  }
  for (const p of players) p.playSound('random.levelup');
  contest = null;
  // Leave the final scores up for a little while.
  system.runTimeout(() => {
    if (!contest) try { world.scoreboard.removeObjective(OBJECTIVE); } catch { /* gone */ }
  }, 200);
}

function tick() {
  if (!contest) return;
  const left = contest.end - system.currentTick;
  if (left <= 1200 && !contest.warned) {
    contest.warned = true;
    for (const p of participants()) {
      p.sendMessage({ translate: `${NS}.contest.minute_left` });
      p.playSound('note.pling');
    }
  }
  if (left <= 0) finish();
}

export function setupContests() {
  world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
    if (itemStack?.typeId !== HORN) return;
    system.run(() => start(source, source.isSneaking ? 'birdrace' : 'falconry'));
  });
  system.runInterval(tick, 20);
}
