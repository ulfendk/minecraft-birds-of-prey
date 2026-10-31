package dk.ulfen.birds;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.birds.entity.Raptor;
import net.minecraft.core.component.DataComponents;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.component.CustomData;
import net.minecraft.world.item.component.ItemLore;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/**
 * Falconry: a trained bird steps onto the falconer's glove (the glove item then holds it),
 * is flown from the glove at what the falconer looks at, and brings the catch back.
 * The lure calls every bird of yours home. Mirrors scripts/falconry.js.
 */
public final class Falconry {
	/** Kills by trained birds, collected a tick later (the loot hasn't dropped yet when they die). */
	private static final List<PendingCatch> PENDING = new ArrayList<>();

	private record PendingCatch(Raptor bird, ServerLevel level, Vec3 at) {}

	private Falconry() {}

	public static void pickUp(Player player, Raptor bird, InteractionHand hand) {
		CompoundTag tag = new CompoundTag();
		tag.putString("id", bird.speciesId());
		if (bird.hasCustomName()) tag.putString("name", bird.getCustomName().getString());
		if (bird.ring() != null) tag.putString("ring", bird.ring());
		tag.putFloat("health", bird.getHealth());
		ItemStack glove = new ItemStack(BirdsRegistry.GLOVE_WITH_BIRD);
		glove.set(DataComponents.CUSTOM_DATA, CustomData.of(tag));
		glove.set(DataComponents.LORE, new ItemLore(List.of(bird.hasCustomName() ? bird.getCustomName() : bird.getType().getDescription())));
		bird.deliverCatch(player);
		player.setItemInHand(hand, glove);
		bird.discard();
		player.playSound(SoundEvents.PARROT_FLY, 1.0F, 0.8F);
		player.sendOverlayMessage(Component.translatable("birds.falconry.on_glove", bird.getDisplayName()));
	}

	/** Casts the bird off the glove, at the quarry in the falconer's line of sight if there is one. */
	public static void release(ServerLevel level, Player player, InteractionHand hand, ItemStack glove) {
		CompoundTag tag = glove.getOrDefault(DataComponents.CUSTOM_DATA, CustomData.EMPTY).copyTag();
		player.setItemInHand(hand, new ItemStack(BirdsRegistry.FALCONER_GLOVE));
		EntityType<? extends Mob> type = BirdsRegistry.BIRDS.get(tag.getStringOr("id", ""));
		if (type == null || !(type.create(level, EntitySpawnReason.TRIGGERED) instanceof Raptor bird)) return;
		Vec3 view = player.getViewVector(1.0F);
		bird.snapTo(player.getX() + view.x, player.getEyeY(), player.getZ() + view.z, player.getYRot(), 0);
		bird.tame(player);
		tag.getString("name").ifPresent(n -> bird.setCustomName(Component.literal(n)));
		tag.getString("ring").ifPresent(bird::setRing);
		bird.setHealth(tag.getFloatOr("health", bird.getMaxHealth()));
		level.addFreshEntity(bird);
		player.playSound(SoundEvents.PARROT_FLY, 1.0F, 1.2F);

		LivingEntity quarry = quarryInSight(player, 64);
		if (quarry != null) {
			bird.setTarget(quarry);
			bird.setDeltaMovement(quarry.position().subtract(bird.position()).normalize());
			player.sendOverlayMessage(Component.translatable("birds.falconry.released", bird.getDisplayName()));
		} else {
			bird.setDeltaMovement(view.x * 0.5, 0.8, view.z * 0.5);
			player.sendOverlayMessage(Component.translatable("birds.falconry.circling", bird.getDisplayName()));
		}
	}

	/** The living thing nearest the centre of the player's view (not them, not their own birds). */
	public static @Nullable LivingEntity quarryInSight(Player player, double range) {
		Vec3 eye = player.getEyePosition();
		Vec3 view = player.getViewVector(1.0F);
		LivingEntity best = null;
		double bestDot = 0.995;
		for (LivingEntity e : player.level().getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(range),
			e -> e != player && e.isAlive() && !(e instanceof Player) && !(e instanceof Raptor r && r.isOwnedBy(player)))) {
			Vec3 to = e.getBoundingBox().getCenter().subtract(eye);
			double dot = to.normalize().dot(view);
			if (dot > bestDot && to.length() <= range && player.hasLineOfSight(e)) {
				best = e;
				bestDot = dot;
			}
		}
		return best;
	}

	/** The lure: every bird of yours comes back and forgets its quarry. */
	public static void recall(ServerLevel level, Player player) {
		player.playSound(SoundEvents.PARROT_FLY, 1.0F, 0.6F);
		player.sendOverlayMessage(Component.translatable("birds.falconry.recall"));
		for (Raptor bird : level.getEntitiesOfClass(Raptor.class, player.getBoundingBox().inflate(160), b -> b.isOwnedBy(player))) {
			bird.setTarget(null);
			if (bird.distanceTo(player) > 24) bird.teleportTo(player.getX(), player.getY() + 6, player.getZ());
			else bird.getNavigation().moveTo(player, 1.5);
		}
	}

	/** A trained bird made a kill: it scores in a contest and brings the loot home. */
	public static void onKill(Raptor bird, LivingEntity dead) {
		if (!bird.isTame() || !(dead.level() instanceof ServerLevel level)) return;
		if (bird.getOwner() instanceof Player owner) {
			Contest.onCatch(owner, dead);
			owner.sendOverlayMessage(Component.translatable("birds.falconry.caught", bird.getDisplayName()));
		}
		PENDING.add(new PendingCatch(bird, level, dead.position()));
	}

	static void tick() {
		if (PENDING.isEmpty()) return;
		for (PendingCatch c : List.copyOf(PENDING)) {
			List<ItemStack> items = new ArrayList<>();
			for (ItemEntity e : c.level().getEntitiesOfClass(ItemEntity.class, new AABB(c.at(), c.at()).inflate(2.5))) {
				items.add(e.getItem().copy());
				e.discard();
			}
			if (c.bird().isAlive()) c.bird().startCarrying(items);
			else items.forEach(i -> c.level().addFreshEntity(new ItemEntity(c.level(), c.at().x, c.at().y, c.at().z, i)));
		}
		PENDING.clear();
	}
}
