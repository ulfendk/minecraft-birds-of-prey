package dk.ulfen.birds;

import java.util.Set;

import dk.ulfen.birds.entity.Raptor;
import dk.ulfen.birds.species.SpeciesRegistry;
import dk.ulfen.birds.world.BirdsWorldgen;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.LivingEntity;

public class BirdsOfPrey implements ModInitializer {
	public static final String MOD_ID = "birds";

	/** Big animals whose carcasses draw the scavengers in. */
	private static final Set<String> CARCASSES = Set.of(
		"minecraft:cow", "minecraft:horse", "minecraft:sheep", "minecraft:pig", "minecraft:goat", "minecraft:llama",
		"minecraft:camel", "minecraft:donkey", "minecraft:mule");

	@Override
	public void onInitialize() {
		SpeciesRegistry.load();
		BirdsRegistry.register();
		BirdsWorldgen.register();
		BirdGuide.init();

		ServerTickEvents.END_SERVER_TICK.register(server -> {
			BirdGuide.tick(server);
			Hides.tick(server);
			Contest.tick(server);
			Falconry.tick();
		});
		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> BirdGuide.onJoin(handler.getPlayer()));
		ServerLivingEntityEvents.AFTER_DEATH.register((entity, source) -> {
			if (source.getEntity() instanceof Raptor bird) Falconry.onKill(bird, entity);
			scavengersArrive(entity);
		});
	}

	/** Condors, kites and lammergeiers circle in when a big animal dies. */
	private static void scavengersArrive(LivingEntity dead) {
		if (!(dead.level() instanceof ServerLevel level)) return;
		if (!CARCASSES.contains(BuiltInRegistries.ENTITY_TYPE.getKey(dead.getType()).toString())) return;
		for (Raptor bird : level.getEntitiesOfClass(Raptor.class, dead.getBoundingBox().inflate(96), b -> b.species().scavenger() && !b.isTame())) {
			bird.getNavigation().moveTo(dead.getX(), dead.getY() + 10, dead.getZ(), 1.2);
		}
	}
}
