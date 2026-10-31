package dk.ulfen.birds.world;

import java.util.function.Predicate;

import dk.ulfen.birds.BirdsRegistry;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectionContext;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.fabricmc.fabric.api.tag.convention.v2.ConventionalBiomeTags;
import net.minecraft.tags.BiomeTags;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.level.biome.Biomes;

/** Natural spawns, from the habitats in the shared specs. */
public final class BirdsWorldgen {
	private BirdsWorldgen() {}

	/** Habitat names used in the shared specs -> biome selectors. */
	private static Predicate<BiomeSelectionContext> biomes(String name) {
		return switch (name) {
			case "mountains" -> BiomeSelectors.tag(BiomeTags.IS_MOUNTAIN);
			case "meadow" -> BiomeSelectors.includeByKey(Biomes.MEADOW);
			case "snowy" -> BiomeSelectors.tag(ConventionalBiomeTags.IS_SNOWY);
			case "taiga" -> BiomeSelectors.tag(BiomeTags.IS_TAIGA);
			case "forest" -> BiomeSelectors.tag(BiomeTags.IS_FOREST);
			case "dark_forest" -> BiomeSelectors.includeByKey(Biomes.DARK_FOREST);
			case "plains" -> BiomeSelectors.tag(ConventionalBiomeTags.IS_PLAINS);
			case "swamp" -> BiomeSelectors.tag(ConventionalBiomeTags.IS_SWAMP);
			case "river" -> BiomeSelectors.tag(BiomeTags.IS_RIVER);
			case "beach" -> BiomeSelectors.tag(BiomeTags.IS_BEACH);
			case "savanna" -> BiomeSelectors.tag(BiomeTags.IS_SAVANNA);
			case "desert" -> BiomeSelectors.tag(ConventionalBiomeTags.IS_DESERT);
			case "mesa" -> BiomeSelectors.tag(BiomeTags.IS_BADLANDS);
			case "jungle" -> BiomeSelectors.tag(BiomeTags.IS_JUNGLE);
			default -> throw new IllegalArgumentException("Unknown habitat " + name);
		};
	}

	public static void register() {
		for (Species s : SpeciesRegistry.all()) {
			for (Species.Spawn spawn : s.spawns()) {
				Predicate<BiomeSelectionContext> selector = spawn.biomes().stream().map(BirdsWorldgen::biomes).reduce(Predicate::or).orElse(c -> false);
				BiomeModifications.addSpawn(selector, MobCategory.CREATURE, BirdsRegistry.BIRDS.get(s.id()), spawn.weight(), spawn.min(), spawn.max());
			}
		}
	}
}
