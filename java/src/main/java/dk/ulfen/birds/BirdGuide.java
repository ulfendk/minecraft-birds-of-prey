package dk.ulfen.birds;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.mojang.serialization.Codec;

import dk.ulfen.birds.entity.Raptor;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentType;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;

/**
 * The Bird Guide: which birds each player has seen, the farthest sighting of each
 * (through binoculars) and how many birds they have ringed. Shown in chat; hover a
 * name to read about it. Mirrors scripts/birdguide.js.
 */
public final class BirdGuide {
	private static final AttachmentType<List<String>> SEEN = AttachmentRegistry.<List<String>>builder()
		.persistent(Codec.STRING.listOf()).copyOnDeath().initializer(ArrayList::new)
		.buildAndRegister(BirdsRegistry.id("seen_birds"));
	private static final AttachmentType<Map<String, Integer>> FARTHEST = AttachmentRegistry.<Map<String, Integer>>builder()
		.persistent(Codec.unboundedMap(Codec.STRING, Codec.INT)).copyOnDeath().initializer(HashMap::new)
		.buildAndRegister(BirdsRegistry.id("farthest_sightings"));
	private static final AttachmentType<Integer> RINGED = AttachmentRegistry.<Integer>builder()
		.persistent(Codec.INT).copyOnDeath().initializer(() -> 0)
		.buildAndRegister(BirdsRegistry.id("birds_ringed"));
	private static final AttachmentType<Boolean> GIVEN = AttachmentRegistry.<Boolean>builder()
		.persistent(Codec.BOOL).copyOnDeath().initializer(() -> false)
		.buildAndRegister(BirdsRegistry.id("bird_guide_given"));
	/** The world's ring counter, kept on the overworld. */
	private static final AttachmentType<Integer> RING_COUNTER = AttachmentRegistry.<Integer>builder()
		.persistent(Codec.INT).initializer(() -> 0)
		.buildAndRegister(BirdsRegistry.id("ring_counter"));

	private BirdGuide() {}

	static void init() {}

	public static int nextRing(ServerLevel level) {
		ServerLevel overworld = level.getServer().overworld();
		int n = overworld.getAttachedOrCreate(RING_COUNTER) + 1;
		overworld.setAttached(RING_COUNTER, n);
		return n;
	}

	public static void addRinged(Player player) {
		player.setAttached(RINGED, player.getAttachedOrCreate(RINGED) + 1);
	}

	/** Records a sighting; returns true when the species is new to the player. */
	public static boolean record(ServerPlayer player, String id, int distance) {
		List<String> seen = player.getAttachedOrCreate(SEEN);
		boolean isNew = !seen.contains(id);
		if (isNew) {
			List<String> next = new ArrayList<>(seen);
			next.add(id);
			player.setAttached(SEEN, next);
			player.sendOverlayMessage(Component.translatable("birds.guide.spotted", Component.translatable("entity.birds." + id)));
			player.level().playSound(null, player.blockPosition(), SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS, 0.6F, 1.4F);
			if (next.size() == BirdsRegistry.BIRDS.size()) player.level().playSound(null, player.blockPosition(), SoundEvents.PLAYER_LEVELUP, SoundSource.PLAYERS, 1.0F, 1.0F);
		}
		if (distance > 0) {
			Map<String, Integer> far = player.getAttachedOrCreate(FARTHEST);
			if (distance > far.getOrDefault(id, 0)) {
				Map<String, Integer> next = new HashMap<>(far);
				next.put(id, distance);
				player.setAttached(FARTHEST, next);
			}
		}
		return isNew;
	}

	/** Every 2 seconds, birds within 10 blocks of a player count as seen. */
	static void tick(MinecraftServer server) {
		if (server.getTickCount() % 40 != 0) return;
		for (ServerPlayer player : server.getPlayerList().getPlayers()) {
			for (Raptor bird : player.level().getEntitiesOfClass(Raptor.class, player.getBoundingBox().inflate(10))) record(player, bird.speciesId(), 0);
		}
	}

	/** Everyone gets a Bird Guide the first time they join. */
	static void onJoin(ServerPlayer player) {
		if (player.getAttachedOrCreate(GIVEN)) return;
		player.setAttached(GIVEN, true);
		player.getInventory().add(new ItemStack(BirdsRegistry.BIRD_GUIDE));
		player.sendSystemMessage(Component.translatable("birds.guide.welcome"));
	}

	public static void show(ServerPlayer player) {
		List<String> seen = player.getAttachedOrCreate(SEEN);
		player.sendSystemMessage(Component.translatable("birds.guide.title").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD)
			.append(Component.literal(" (" + seen.size() + "/" + BirdsRegistry.BIRDS.size() + ")").withStyle(ChatFormatting.GRAY)));
		player.sendSystemMessage(Component.translatable("birds.guide.ringed", String.valueOf(player.getAttachedOrCreate(RINGED))).withStyle(ChatFormatting.GRAY));
		if (seen.isEmpty()) {
			player.sendSystemMessage(Component.translatable("birds.guide.intro").withStyle(ChatFormatting.GRAY));
			return;
		}
		Map<String, Integer> far = player.getAttachedOrCreate(FARTHEST);
		for (String group : List.of("eagle", "falcon", "hawk", "owl", "vulture")) {
			MutableComponent line = Component.translatable("birds.group." + group).withStyle(ChatFormatting.DARK_GREEN).append(": ");
			boolean any = false;
			for (Species s : SpeciesRegistry.all()) {
				if (!s.group().equals(group) || !seen.contains(s.id())) continue;
				if (any) line.append(Component.literal(", ").withStyle(ChatFormatting.GRAY));
				any = true;
				line.append(Component.translatable("entity.birds." + s.id()).withStyle(style -> style
					.withColor(ChatFormatting.GREEN)
					.withHoverEvent(new HoverEvent.ShowText(entry(s, far.get(s.id()))))));
			}
			if (any) player.sendSystemMessage(line);
		}
	}

	private static Component entry(Species s, Integer farthest) {
		MutableComponent c = Component.translatable("entity.birds." + s.id()).withStyle(ChatFormatting.GOLD)
			.append("\n").append(Component.translatable("birds.guide.entry." + s.id()).withStyle(ChatFormatting.WHITE));
		List<String> biomes = s.spawns().stream().flatMap(sp -> sp.biomes().stream()).distinct().toList();
		if (!biomes.isEmpty()) {
			c.append("\n").append(Component.translatable("birds.guide.lives_in").withStyle(ChatFormatting.DARK_GREEN)).append(" ");
			for (int i = 0; i < biomes.size(); i++) {
				if (i > 0) c.append(", ");
				c.append(Component.translatable("birds.habitat." + biomes.get(i)));
			}
		}
		if (farthest != null) c.append("\n").append(Component.translatable("birds.guide.farthest", String.valueOf(farthest)).withStyle(ChatFormatting.DARK_GREEN));
		return c;
	}
}
