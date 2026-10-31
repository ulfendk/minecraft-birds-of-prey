package dk.ulfen.birds;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import dk.ulfen.birds.entity.Raptor;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;

/**
 * Bird rings: a numbered ring on a bird's leg. Using a ring on a ringed bird reads it back:
 * who ringed it, on which day, and how far it has moved since. The ring is stored as the
 * same JSON as on Bedrock (scripts/ringing.js).
 */
public final class Ringing {
	private Ringing() {}

	public static void fit(Player player, Raptor bird, ItemStack held) {
		if (bird.isBaby()) {
			player.sendSystemMessage(Component.translatable("birds.ring.baby"));
			return;
		}
		if (bird.ring() != null) {
			JsonObject r = JsonParser.parseString(bird.ring()).getAsJsonObject();
			long moved = Math.round(Math.hypot(bird.getX() - r.get("x").getAsDouble(), bird.getZ() - r.get("z").getAsDouble()));
			player.sendSystemMessage(Component.translatable("birds.ring.info", r.get("id").getAsString(), r.get("by").getAsString(), r.get("day").getAsString(), String.valueOf(moved)));
			return;
		}
		ServerLevel level = (ServerLevel) bird.level();
		int n = BirdGuide.nextRing(level);
		JsonObject r = new JsonObject();
		r.addProperty("id", String.format("BP %05d", n));
		r.addProperty("by", player.getName().getString());
		r.addProperty("day", level.getOverworldClockTime() / 24000L + 1);
		r.addProperty("x", Math.round(bird.getX()));
		r.addProperty("z", Math.round(bird.getZ()));
		bird.setRing(r.toString());
		BirdGuide.addRinged(player);
		held.consume(1, player);
		bird.playSound(SoundEvents.ANVIL_USE, 0.4F, 2.0F);
		player.sendSystemMessage(Component.translatable("birds.ring.ringed", r.get("id").getAsString(), bird.getType().getDescription()));
	}
}
