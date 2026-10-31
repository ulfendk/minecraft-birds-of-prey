package dk.ulfen.birds.client;

import dk.ulfen.birds.BirdsRegistry;
import dk.ulfen.birds.entity.Raptor;
import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.renderer.entity.EntityRenderers;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;

public class BirdsClient implements ClientModInitializer {
	@Override
	@SuppressWarnings("unchecked")
	public void onInitializeClient() {
		for (EntityType<? extends Mob> type : BirdsRegistry.BIRDS.values()) {
			EntityType<Raptor> t = (EntityType<Raptor>) (EntityType<?>) type;
			EntityRenderers.register(t, context -> new RaptorRenderer(context, t));
		}
	}
}
