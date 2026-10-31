package dk.ulfen.birds;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;

/** Players standing next to a bird hide are hidden from wild birds. Mirrors scripts/hides.js. */
public final class Hides {
	private static final Set<UUID> HIDDEN = new HashSet<>();

	private Hides() {}

	public static boolean isHidden(Player player) {
		return HIDDEN.contains(player.getUUID());
	}

	static void tick(MinecraftServer server) {
		if (server.getTickCount() % 20 != 0) return;
		for (ServerPlayer player : server.getPlayerList().getPlayers()) {
			boolean near = BlockPos.betweenClosedStream(player.blockPosition().offset(-2, -1, -2), player.blockPosition().offset(2, 1, 2))
				.anyMatch(pos -> player.level().getBlockState(pos).is(BirdsRegistry.BIRD_HIDE));
			if (near == HIDDEN.contains(player.getUUID())) continue;
			if (near) {
				HIDDEN.add(player.getUUID());
				player.sendOverlayMessage(Component.translatable("birds.hide.inside"));
			} else HIDDEN.remove(player.getUUID());
		}
	}
}
