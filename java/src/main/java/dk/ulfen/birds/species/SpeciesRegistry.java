package dk.ulfen.birds.species;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.EntityType;
import org.jspecify.annotations.Nullable;

/** Loads data/birds/species.json from the mod jar at startup. */
public final class SpeciesRegistry {
	private static final Map<String, Species> BY_ID = new LinkedHashMap<>();

	private SpeciesRegistry() {}

	public static void load() {
		try (InputStream in = SpeciesRegistry.class.getResourceAsStream("/data/birds/species.json")) {
			if (in == null) throw new IllegalStateException("species.json missing from the mod jar (run `npm run build`)");
			List<Species> list = new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), new TypeToken<List<Species>>() {}.getType());
			for (Species s : list) BY_ID.put(s.id(), s);
		} catch (java.io.IOException e) {
			throw new IllegalStateException("Could not read species.json", e);
		}
	}

	public static Iterable<Species> all() {
		return BY_ID.values();
	}

	public static Species get(String id) {
		Species s = BY_ID.get(id);
		if (s == null) throw new IllegalArgumentException("Unknown species " + id);
		return s;
	}

	public static @Nullable Species find(String id) {
		return BY_ID.get(id);
	}

	/** Species of a bird entity type (its registry path is the species id). */
	public static Species of(EntityType<?> type) {
		return get(BuiltInRegistries.ENTITY_TYPE.getKey(type).getPath());
	}
}
