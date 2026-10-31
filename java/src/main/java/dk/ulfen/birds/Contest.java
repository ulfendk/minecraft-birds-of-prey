package dk.ulfen.birds;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import dk.ulfen.birds.species.SpeciesRegistry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.scores.DisplaySlot;
import net.minecraft.world.scores.Objective;
import net.minecraft.world.scores.PlayerScoreEntry;
import net.minecraft.world.scores.Scoreboard;
import net.minecraft.world.scores.criteria.ObjectiveCriteria;
import org.jspecify.annotations.Nullable;

/**
 * Contests started with the contest horn: a five-minute falconry contest (points for your
 * trained birds' catches) or, blown while sneaking, a bird race (points for every species
 * spotted through binoculars, rarer ones worth more). Scores on the sidebar; the winner
 * gets the Golden Raptor. Mirrors scripts/contest.js.
 */
public final class Contest {
	private static final String OBJECTIVE = "birds_contest";
	private static final int MINUTES = 5;
	private static final double RANGE = 64;

	private record Running(String type, long end, Set<UUID> players, Map<UUID, Set<String>> seen, boolean[] warned) {}

	private static @Nullable Running running;
	private static long clearAt = -1;

	private Contest() {}

	public static boolean isRunning() {
		return running != null;
	}

	/** Points for a falconry catch, by what was caught. */
	public static int catchPoints(LivingEntity dead) {
		String id = BuiltInRegistries.ENTITY_TYPE.getKey(dead.getType()).getPath();
		return switch (id) {
			case "fox" -> 5;
			case "rabbit" -> 3;
			case "chicken" -> 1;
			case "cod", "salmon", "tropical_fish", "pufferfish" -> 2;
			default -> dead instanceof net.minecraft.world.entity.monster.Enemy ? 4 : 2;
		};
	}

	public static void start(ServerPlayer player, boolean birdRace) {
		MinecraftServer server = player.level().getServer();
		if (running != null) {
			player.sendOverlayMessage(Component.translatable("birds.contest.running"));
			return;
		}
		String type = birdRace ? "birdrace" : "falconry";
		Scoreboard board = server.getScoreboard();
		Objective old = board.getObjective(OBJECTIVE);
		if (old != null) board.removeObjective(old);
		Objective obj = board.addObjective(OBJECTIVE, ObjectiveCriteria.DUMMY, Component.translatable("birds.contest." + type).withStyle(net.minecraft.ChatFormatting.GOLD),
			ObjectiveCriteria.RenderType.INTEGER, true, null);
		board.setDisplayObjective(DisplaySlot.SIDEBAR, obj);
		List<ServerPlayer> nearby = player.level().getEntitiesOfClass(ServerPlayer.class, player.getBoundingBox().inflate(RANGE));
		Set<UUID> ids = new HashSet<>();
		for (ServerPlayer p : nearby) {
			ids.add(p.getUUID());
			board.getOrCreatePlayerScore(p, obj).set(0);
		}
		running = new Running(type, server.getTickCount() + MINUTES * 1200L, ids, new HashMap<>(), new boolean[1]);
		clearAt = -1;
		player.level().playSound(null, player.blockPosition(), SoundEvents.RAID_HORN.value(), SoundSource.PLAYERS, 4.0F, 1.0F);
		for (ServerPlayer p : nearby) {
			p.sendSystemMessage(Component.translatable("birds.contest.started", player.getName(), Component.translatable("birds.contest." + type), String.valueOf(MINUTES)));
			p.sendSystemMessage(Component.translatable("birds.contest.rules_" + type));
		}
	}

	private static void addPoints(Player player, int points, Component reason) {
		if (!(player instanceof ServerPlayer sp)) return;
		Scoreboard board = sp.level().getServer().getScoreboard();
		Objective obj = board.getObjective(OBJECTIVE);
		if (obj == null) return;
		running.players().add(sp.getUUID());
		board.getOrCreatePlayerScore(sp, obj).add(points);
		sp.sendOverlayMessage(Component.translatable("birds.contest.points", String.valueOf(points), reason));
		sp.level().playSound(null, sp.blockPosition(), SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS, 0.6F, 1.8F);
	}

	static void onCatch(Player owner, LivingEntity dead) {
		if (running == null || !running.type().equals("falconry")) return;
		addPoints(owner, catchPoints(dead), dead.getType().getDescription());
	}

	public static void onSighting(Player player, String id) {
		if (running == null || !running.type().equals("birdrace")) return;
		Set<String> seen = running.seen().computeIfAbsent(player.getUUID(), u -> new HashSet<>());
		if (!seen.add(id)) return;
		addPoints(player, SpeciesRegistry.get(id).racePoints(), Component.translatable("entity.birds." + id));
	}

	static void tick(MinecraftServer server) {
		long now = server.getTickCount();
		if (clearAt > 0 && now >= clearAt && running == null) {
			Objective obj = server.getScoreboard().getObjective(OBJECTIVE);
			if (obj != null) server.getScoreboard().removeObjective(obj);
			clearAt = -1;
		}
		if (running == null || now % 20 != 0) return;
		List<ServerPlayer> players = server.getPlayerList().getPlayers().stream().filter(p -> running.players().contains(p.getUUID())).toList();
		if (running.end() - now <= 1200 && !running.warned()[0]) {
			running.warned()[0] = true;
			players.forEach(p -> p.sendSystemMessage(Component.translatable("birds.contest.minute_left")));
		}
		if (now < running.end()) return;

		Objective obj = server.getScoreboard().getObjective(OBJECTIVE);
		List<PlayerScoreEntry> scores = obj == null ? List.of() : server.getScoreboard().listPlayerScores(obj).stream()
			.sorted(Comparator.comparingInt(PlayerScoreEntry::value).reversed()).toList();
		Component name = Component.translatable("birds.contest." + running.type());
		for (ServerPlayer p : players) {
			p.sendSystemMessage(Component.translatable("birds.contest.over", name));
			if (scores.isEmpty() || scores.get(0).value() <= 0) {
				p.sendSystemMessage(Component.translatable("birds.contest.no_winner"));
				continue;
			}
			p.sendSystemMessage(Component.translatable("birds.contest.winner", scores.get(0).owner(), String.valueOf(scores.get(0).value())));
			for (int i = 0; i < Math.min(3, scores.size()); i++) {
				p.sendSystemMessage(Component.translatable("birds.contest.place", String.valueOf(i + 1), scores.get(i).owner(), String.valueOf(scores.get(i).value())));
			}
			p.level().playSound(null, p.blockPosition(), SoundEvents.PLAYER_LEVELUP, SoundSource.PLAYERS, 1.0F, 1.0F);
		}
		if (!scores.isEmpty() && scores.get(0).value() > 0) {
			ServerPlayer winner = server.getPlayerList().getPlayerByName(scores.get(0).owner());
			if (winner != null) {
				if (!winner.getInventory().add(new ItemStack(BirdsRegistry.GOLDEN_RAPTOR))) winner.spawnAtLocation(winner.level(), new ItemStack(BirdsRegistry.GOLDEN_RAPTOR));
				winner.level().playSound(null, winner.blockPosition(), SoundEvents.TOTEM_USE, SoundSource.PLAYERS, 1.0F, 1.0F);
			}
		}
		running = null;
		clearAt = now + 200; // leave the final scores up for a little while
	}
}
