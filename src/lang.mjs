// In-game texts (.lang files) for every supported language.
// Danish names for birds, items, habitats and tags are shared with the website (src/i18n.mjs).
import { guide } from './guide.mjs';
import { STRINGS } from './i18n.mjs';
import { NS } from './lib/constants.mjs';
import { BIOME_NAMES, GROUPS, TAGS } from './lib/info.mjs';

export const LOCALES = ['en_US', 'da_DK'];

const UI = {
  'guide.title': ['Bird Guide', 'Fuglebog'],
  'guide.intro': [
    'Birds you have seen appear here. Get close to a bird, or watch it through your binoculars, to add it.',
    'Fugle, du har set, dukker op her. Kom tæt på en fugl, eller se på den gennem din kikkert, for at tilføje den.',
  ],
  'guide.spotted': ['New in your Bird Guide: %s', 'Ny i din fuglebog: %s'],
  'guide.back': ['Back to the Bird Guide', 'Tilbage til fuglebogen'],
  'guide.welcome': [
    '§6You received a Bird Guide!§r Use it to see the birds you have spotted.',
    '§6Du har fået en fuglebog!§r Brug den til at se de fugle, du har opdaget.',
  ],
  'guide.lives_in': ['Lives in:', 'Lever i:'],
  'guide.traits': ['Traits:', 'Kendetegn:'],
  'guide.group': ['Group:', 'Gruppe:'],
  'guide.farthest': ['Farthest sighting: %s blocks', 'Længste observation: %s blokke'],
  'guide.ringed': ['Birds you have ringed: %s', 'Fugle, du har ringmærket: %s'],
  'binoculars.sighting': ['%s · %s blocks away', '%s · %s blokke væk'],
  'falconry.tamed': ['%s trusts you now. Pick it up with a falconer’s glove.', '%s stoler på dig nu. Tag den op med en falkonerhandske.'],
  'falconry.on_glove': ['%s is on your glove. Use the glove to fly it at what you are looking at.', '%s sidder på din handske. Brug handsken for at sende den efter det, du kigger på.'],
  'falconry.not_yours': ['This bird belongs to another falconer.', 'Denne fugl tilhører en anden falkoner.'],
  'falconry.released': ['%s is off after its quarry!', '%s er afsted efter byttet!'],
  'falconry.circling': ['%s flies up and waits above you.', '%s flyver op og venter over dig.'],
  'falconry.caught': ['%s made a kill.', '%s fik fat i byttet.'],
  'falconry.returned': ['%s brings you its catch.', '%s kommer med sit bytte til dig.'],
  'falconry.hooded': ['You slip the hood on. The bird settles down.', 'Du giver fuglen hætten på. Den falder til ro.'],
  'falconry.unhooded': ['You take the hood off.', 'Du tager hætten af.'],
  'falconry.recall': ['You swing the lure. Your birds are coming back.', 'Du svinger luren. Dine fugle kommer tilbage.'],
  'call.used': ['You give a call. Birds of prey nearby come to look.', 'Du kalder. Rovfugle i nærheden kommer for at se.'],
  'ring.ringed': ['You fit ring %s on the %s.', 'Du sætter ring %s på fuglen: %s.'],
  'ring.info': ['Ring %s, fitted by %s on day %s, %s blocks from here.', 'Ring %s, sat på af %s på dag %s, %s blokke herfra.'],
  'ring.baby': ['Wait until it has grown up.', 'Vent, til den er voksen.'],
  'pellet.dissected': ['You pull the pellet apart: fur and the bones of the owl’s prey.', 'Du piller gylpet fra hinanden: pels og knogler fra uglens bytte.'],
  'nest.moved_in': ['A %s has moved into your nest box.', 'En %s er flyttet ind i din redekasse.'],
  'nest.chick': ['A chick has hatched in the nest box!', 'En unge er klækket i redekassen!'],
  'contest.falconry': ['Falconry Contest', 'Falkejagtkonkurrence'],
  'contest.birdrace': ['Bird Race', 'Fugleræs'],
  'contest.started': ['%s started a %s! %s minutes – go!', '%s har startet en %s! %s minutter – afsted!'],
  'contest.rules_falconry': ['Points for every catch your trained birds make. Rabbit 3, fox 5, fish 2, chicken 1, monster 4.', 'Point for hvert bytte, dine trænede fugle fanger. Kanin 3, ræv 5, fisk 2, kylling 1, monster 4.'],
  'contest.rules_birdrace': ['Points for every species you spot through your binoculars. Rare birds are worth more.', 'Point for hver art, du ser gennem din kikkert. Sjældne fugle giver flere point.'],
  'contest.running': ['A contest is already running.', 'Der er allerede en konkurrence i gang.'],
  'contest.points': ['+%s points: %s', '+%s point: %s'],
  'contest.minute_left': ['One minute left!', 'Ét minut tilbage!'],
  'contest.over': ['The %s is over!', '%s er slut!'],
  'contest.winner': ['§6%s wins with %s points!', '§6%s vinder med %s point!'],
  'contest.no_winner': ['Nobody scored. Better luck next time!', 'Ingen fik point. Bedre held næste gang!'],
  'contest.place': ['%s. %s – %s points', '%s. %s – %s point'],
  'contest.score': ['Score', 'Point'],
  'hide.inside': ['You are hidden in the bird hide.', 'Du sidder skjult i fugleskjulet.'],
};

/** Lang entries for one locale as [key, value] pairs. */
export function langEntries(locale, { animals, items, blocks, description, version }) {
  const i = Math.max(0, LOCALES.indexOf(locale));
  const da = locale === 'da_DK' ? STRINGS.da : null;
  const out = [];
  out.push(['pack.description', da
    ? `Birds of Prey: ørne, falke, høge, ugler og gribbe til Minecraft, med falkejagt og fugleudstyr (v${version})`
    : `${description} (v${version})`]);
  for (const a of animals) {
    const name = da?.names[a.id] ?? a.name;
    out.push([`entity.${NS}:${a.id}.name`, name]);
    out.push([`item.spawn_egg.entity.${NS}:${a.id}.name`, da ? `${name}-spawnæg` : `${a.name} Spawn Egg`]);
    out.push([`${NS}.guide.entry.${a.id}`, da?.guide[a.id] ?? guide[a.id] ?? '']);
  }
  for (const item of items) out.push([`item.${NS}:${item.id}.name`, da?.items[item.id] ?? item.name]);
  for (const block of blocks) out.push([`tile.${NS}:${block.id}.name`, da?.items[block.id] ?? block.name]);
  for (const [id, name] of Object.entries(BIOME_NAMES)) out.push([`${NS}.habitat.${id}`, da?.habitats[name] ?? name]);
  for (const [id, name] of Object.entries(TAGS)) out.push([`${NS}.tag.${id}`, da?.tags[name] ?? name]);
  for (const [id, name] of Object.entries(GROUPS)) out.push([`${NS}.group.${id}`, da?.groups[name] ?? name]);
  for (const [key, pair] of Object.entries(UI)) out.push([`${NS}.${key}`, pair[i]]);
  return out;
}
