package dk.ulfen.birds.item;

import dk.ulfen.birds.Contest;
import dk.ulfen.birds.Falconry;
import dk.ulfen.birds.entity.Raptor;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;

/** Gear that does something when used: the lure, the bird call, owl pellets and the contest horn. */
public class GearItem extends Item {
	public enum Kind { LURE, CALL, PELLET, HORN }

	private final Kind kind;

	public GearItem(Item.Properties properties, Kind kind) {
		super(properties);
		this.kind = kind;
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (!(level instanceof ServerLevel server)) return InteractionResult.SUCCESS;
		switch (this.kind) {
			case LURE -> Falconry.recall(server, player);
			case CALL -> call(server, player);
			case PELLET -> dissect(player, player.getItemInHand(hand));
			case HORN -> {
				if (player instanceof ServerPlayer sp) Contest.start(sp, player.isShiftKeyDown());
				player.getCooldowns().addCooldown(player.getItemInHand(hand), 100);
			}
		}
		return InteractionResult.SUCCESS;
	}

	/** Wild raptors around come over to look. */
	private static void call(ServerLevel level, Player player) {
		level.playSound(null, player.blockPosition(), SoundEvents.PHANTOM_AMBIENT, SoundSource.PLAYERS, 2.0F, 1.8F);
		player.sendOverlayMessage(Component.translatable("birds.call.used"));
		for (Raptor bird : level.getEntitiesOfClass(Raptor.class, player.getBoundingBox().inflate(64), b -> !b.isTame())) {
			bird.getNavigation().moveTo(player.getX(), player.getY() + 8, player.getZ(), 1.5);
		}
	}

	/** Pull an owl pellet apart: bone meal, sometimes a bone, rarely a rabbit's foot. */
	private static void dissect(Player player, ItemStack pellet) {
		pellet.consume(1, player);
		player.playSound(SoundEvents.FOX_EAT, 1.0F, 1.0F);
		give(player, new ItemStack(Items.BONE_MEAL, 1 + player.getRandom().nextInt(3)));
		if (player.getRandom().nextFloat() < 0.4F) give(player, new ItemStack(Items.BONE));
		if (player.getRandom().nextFloat() < 0.05F) give(player, new ItemStack(Items.RABBIT_FOOT));
		player.sendOverlayMessage(Component.translatable("birds.pellet.dissected"));
	}

	private static void give(Player player, ItemStack stack) {
		if (!player.getInventory().add(stack) && player.level() instanceof ServerLevel level) player.spawnAtLocation(level, stack);
	}
}
