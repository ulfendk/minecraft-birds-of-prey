# Birds of Prey

A Minecraft **Bedrock Edition** add-on and **Java Edition** (Fabric) mod with 22 birds of prey – eagles, falcons, hawks, owls and vultures – plus falconry, contests and birdwatching gear.

**Download and info: https://ulfendk.github.io/minecraft-birds-of-prey/** (på dansk: https://ulfendk.github.io/minecraft-birds-of-prey/da/)

![Peregrine falcon](https://ulfendk.github.io/minecraft-birds-of-prey/img/animals/peregrine_falcon.png)

## Features
- 22 birds, each with its own model, plumage, flight and calls: golden, bald, white-tailed and Steller's sea eagles, peregrine, gyrfalcon and kestrel, goshawk, sparrowhawk, red kite, buzzard, Harris's hawk, marsh harrier, osprey, barn, tawny, snowy, great grey and eagle owls, secretary bird, Andean condor and lammergeier.
- Real hunting styles: falcons stoop from on high, kestrels and ospreys hover, ospreys plunge for fish, eagles and vultures soar, owls hunt at night, Harris's hawks hunt in families, the secretary bird stamps on snakes, the lammergeier drops bones to crack them, and scavengers circle in when a big animal dies.
- **Falconry:** tame a falcon, hawk, golden eagle or owl with raw meat, carry it on the falconer's glove, fly it at what you're looking at, and it brings back the catch. A lure calls your birds home; a hood keeps them calm.
- **Contests:** blow the contest horn for a five-minute falconry contest (points for your birds' catches) or, sneaking, a bird race (points for every species you spot through binoculars). Scores on the sidebar, a Golden Raptor trophy for the winner to put on display.
- **Birdwatching gear:** binoculars that zoom, a Bird Guide that fills in as you spot birds, numbered bird rings, a bird hide to watch from, nest boxes that kestrels and owls move into, a bird call, and owl pellets to pull apart.
- Wild birds are shy: sneak, or stand behind a hide. Birds of prey are protected – they aren't game for Realistic Hunting.

## Install
1. Download `BirdsOfPrey.mcaddon` from the [latest release](https://github.com/ulfendk/minecraft-birds-of-prey/releases/latest).
2. Open it on Windows, Android or iOS. Minecraft imports both packs.
3. In your world settings, turn on **Birds of Prey** under *Behavior Packs*.

Requires Minecraft Bedrock 1.21.120 or newer.

### Java Edition
1. Install [Fabric Loader](https://fabricmc.net/use/installer/) for Minecraft 26.3.
2. Download `birds-of-prey-fabric-<version>.jar` from the [latest release](https://github.com/ulfendk/minecraft-birds-of-prey/releases/latest), plus [Fabric API](https://modrinth.com/mod/fabric-api) and [GeckoLib](https://modrinth.com/mod/geckolib).
3. Put all three in your `mods` folder.

## Development
Everything is generated from code. Models, textures and animations come from the specs in `src/animals/`.

```sh
npm ci
npm run build        # writes build/behavior_pack and build/resource_pack (and the Java resources)
npm run validate     # static checks, mostly for the resource pack
npm test             # unit tests for the bird and text data
npm run preview      # renders every bird to build/preview/*.png
npm run package      # dist/*.mcaddon and *.mcpack
npm run site         # the website, in build/site/
npm run test:server  # loads the packs in a Bedrock Dedicated Server (needs Docker)

cd java                       # Java edition (needs JDK 25; run `npm run build` first)
./gradlew build runGameTest   # the Fabric mod jar in java/build/libs, plus server-side game tests
./gradlew runClient           # play it
```

| Path | What it is |
| --- | --- |
| `src/animals/*.mjs` | One file per bird: stats, behaviour, proportions and plumage |
| `src/lib/bodies.mjs` | The bird skeleton: modelled in flight, folded into a perched pose by its rest rotations |
| `src/lib/anim.mjs` | Flight, hover, stoop, glide, strike, roost and other animations |
| `src/lib/` | Other generators: UV packing, procedural textures and feather patterns, entity JSON |
| `src/packs/behavior_pack/scripts/` | Script API code: falconry, contests, binoculars, Bird Guide, rings, hides, nest boxes |
| `src/items.mjs`, `src/blocks.mjs` | Custom items, blocks and recipes |
| `tools/` | Build, validation, preview renderer, packaging, website, server test, Java resources |
| `java/` | The Fabric mod (Java edition); the behaviour lives in `java/src/main/java`, driven by the generated `species.json` |

### Adding a bird
Copy a similar spec in `src/animals/`, adjust the proportions (`body`) and plumage (`materials`), run `npm run preview <id>` and look at `build/preview/<id>.png`. Add its text to `src/guide.mjs` and its Danish name and text to `src/i18n.mjs`.

### Releases
Bump `version` in `package.json`, add a section to `CHANGELOG.md`, then push a tag such as `v0.2.0`. The release workflow builds and tests the packs, publishes a GitHub Release with the files, and updates the website.

## Support

If you enjoy our mods, you can support us on [GitHub Sponsors](https://github.com/sponsors/ulfendk) or [Buy Me a Coffee](https://buymeacoffee.com/ulfendk).

## License
MIT. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
