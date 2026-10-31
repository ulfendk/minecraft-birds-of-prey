package dk.ulfen.birds.species;

import java.util.List;
import java.util.Set;

/**
 * One bird's settings, generated from the shared specs into data/birds/species.json
 * by tools/java.mjs. Field names match the JSON.
 */
public record Species(
	String id,
	String group,
	float width,
	float height,
	double health,
	double speed,
	double flySpeed,
	double attackDamage,
	List<String> hunts,
	double huntRange,
	float shy,
	boolean alertsPack,
	String sleeps,
	boolean walks,
	boolean falconry,
	float tameChance,
	boolean stoops,
	boolean hovers,
	boolean soars,
	boolean pellets,
	boolean scavenger,
	boolean dropsBones,
	boolean nestBox,
	float scale,
	int racePoints,
	Sounds sounds,
	Set<String> animations,
	List<Spawn> spawns
) {
	public record Sounds(String ambient, String hurt, String death, float pitchMin, float pitchMax, int interval) {}

	public record Spawn(List<String> biomes, int weight, int min, int max) {}

	public boolean flies() {
		return !walks;
	}

	public boolean isOwl() {
		return "owl".equals(group);
	}

	public boolean fishes() {
		return hunts.contains("minecraft:cod");
	}

	public boolean hasAnimation(String name) {
		return animations.contains(name);
	}

	/** Full GeckoLib animation name, e.g. animation.birds.kestrel.hover. */
	public String animation(String name) {
		return "animation.birds." + id + "." + name;
	}
}
