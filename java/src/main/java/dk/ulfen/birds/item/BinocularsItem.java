package dk.ulfen.birds.item;

import dk.ulfen.birds.BirdGuide;
import dk.ulfen.birds.Contest;
import dk.ulfen.birds.entity.Raptor;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SpyglassItem;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * Zooms in like a spyglass (see mixin/PlayerMixin). The bird you look at is named with its
 * distance and goes in your Bird Guide; in a bird race it scores.
 */
public class BinocularsItem extends SpyglassItem {
	private static final double RANGE = 160;

	public BinocularsItem(Properties properties) {
		super(properties);
	}

	@Override
	public void onUseTick(Level level, LivingEntity user, ItemStack stack, int ticksRemaining) {
		if (!(user instanceof ServerPlayer player) || ticksRemaining % 5 != 0) return;
		Raptor bird = birdInView(player);
		if (bird == null) return;
		int distance = (int) Math.round(bird.distanceTo(player));
		player.sendOverlayMessage(Component.translatable("birds.binoculars.sighting", bird.getType().getDescription(), String.valueOf(distance)));
		BirdGuide.record(player, bird.speciesId(), distance);
		Contest.onSighting(player, bird.speciesId());
	}

	private static Raptor birdInView(ServerPlayer player) {
		Vec3 eye = player.getEyePosition();
		Vec3 view = player.getViewVector(1.0F);
		Raptor best = null;
		double bestDot = 0.997;
		for (Raptor bird : player.level().getEntitiesOfClass(Raptor.class, player.getBoundingBox().inflate(RANGE))) {
			Vec3 to = bird.getBoundingBox().getCenter().subtract(eye);
			double dot = to.normalize().dot(view);
			if (dot > bestDot && to.length() <= RANGE && player.hasLineOfSight(bird)) {
				best = bird;
				bestDot = dot;
			}
		}
		return best;
	}
}
