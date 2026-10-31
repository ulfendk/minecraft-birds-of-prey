package dk.ulfen.birds.test;

import java.util.ArrayList;
import java.util.List;

import dk.ulfen.birds.BirdsRegistry;
import dk.ulfen.birds.Contest;
import dk.ulfen.birds.Falconry;
import dk.ulfen.birds.entity.Raptor;
import net.fabricmc.fabric.api.gametest.v1.GameTest;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.item.ItemStack;

/** Server-side checks run by `./gradlew runGameTest` (and in CI). */
public class BirdsGameTests {
	private static Raptor spawn(GameTestHelper helper, String id, BlockPos pos) {
		return (Raptor) helper.spawn(BirdsRegistry.BIRDS.get(id), pos);
	}

	/** Every species can be spawned and is still alive two seconds later. */
	@GameTest(maxTicks = 100)
	public void everyBirdSpawns(GameTestHelper helper) {
		List<Mob> mobs = new ArrayList<>();
		int i = 0;
		for (EntityType<? extends Mob> type : BirdsRegistry.BIRDS.values()) {
			Mob mob = helper.spawn(type, new BlockPos(1 + (i % 6), 1, 1 + (i / 6)));
			mob.addEffect(new MobEffectInstance(MobEffects.RESISTANCE, 200, 4));
			mob.setNoAi(true);
			mobs.add(mob);
			i++;
		}
		helper.runAfterDelay(40, () -> {
			for (Mob m : mobs) {
				if (!m.isAlive()) helper.fail("Died or vanished: " + m.getType().getDescriptionId());
			}
			helper.succeed();
		});
	}

	/** A wild goshawk goes after a chicken. */
	@GameTest(maxTicks = 400)
	public void wildBirdHuntsPrey(GameTestHelper helper) {
		Raptor hawk = spawn(helper, "northern_goshawk", new BlockPos(1, 1, 1));
		Mob chicken = helper.spawn(net.minecraft.world.entity.EntityTypes.CHICKEN, new BlockPos(5, 1, 5));
		helper.succeedWhen(() -> {
			if (hawk.getTarget() != chicken && chicken.isAlive()) helper.fail("Goshawk has not gone for the chicken yet");
		});
	}

	/** A trained bird steps onto the glove (becoming the item) and is flown off it again, still yours. */
	@GameTest(maxTicks = 100)
	public void gloveRoundTrip(GameTestHelper helper) {
		ServerPlayer player = helper.makeMockServerPlayerInLevel();
		player.setPos(helper.absoluteVec(new net.minecraft.world.phys.Vec3(4.5, 1, 4.5))); // mock players start at the world origin
		Raptor kestrel = spawn(helper, "kestrel", new BlockPos(2, 1, 2));
		kestrel.tame(player);
		player.setItemInHand(InteractionHand.MAIN_HAND, new ItemStack(BirdsRegistry.FALCONER_GLOVE));
		Falconry.pickUp(player, kestrel, InteractionHand.MAIN_HAND);
		ItemStack glove = player.getItemInHand(InteractionHand.MAIN_HAND);
		if (!glove.is(BirdsRegistry.GLOVE_WITH_BIRD)) helper.fail("The glove does not hold the bird");
		helper.runAfterDelay(2, () -> {
			if (kestrel.isAlive()) helper.fail("The bird is still in the world while on the glove");
			Falconry.release(helper.getLevel(), player, InteractionHand.MAIN_HAND, player.getItemInHand(InteractionHand.MAIN_HAND));
			if (!player.getItemInHand(InteractionHand.MAIN_HAND).is(BirdsRegistry.FALCONER_GLOVE)) helper.fail("The empty glove did not come back");
			helper.runAfterDelay(2, () -> {
				List<Raptor> all = helper.getLevel().getEntitiesOfClass(Raptor.class, player.getBoundingBox().inflate(32));
				if (all.stream().noneMatch(b -> b.isOwnedBy(player))) helper.fail("The released kestrel is not trained to the falconer: "
					+ all.size() + " birds, tame " + all.stream().filter(Raptor::isTame).count() + ", player at " + player.position());
				helper.succeed();
			});
		});
	}

	/** Falconry contest points follow the table on the website. */
	@GameTest(maxTicks = 20)
	public void contestPoints(GameTestHelper helper) {
		if (Contest.catchPoints(helper.spawn(net.minecraft.world.entity.EntityTypes.FOX, new BlockPos(1, 1, 1))) != 5) helper.fail("A fox should score 5");
		if (Contest.catchPoints(helper.spawn(net.minecraft.world.entity.EntityTypes.RABBIT, new BlockPos(2, 1, 1))) != 3) helper.fail("A rabbit should score 3");
		if (Contest.catchPoints(helper.spawn(net.minecraft.world.entity.EntityTypes.ZOMBIE, new BlockPos(3, 1, 1))) != 4) helper.fail("A monster should score 4");
		helper.succeed();
	}

	/** A hood keeps a trained bird calm and still. */
	@GameTest(maxTicks = 40)
	public void hoodSitsTheBird(GameTestHelper helper) {
		ServerPlayer player = helper.makeMockServerPlayerInLevel();
		Raptor hawk = spawn(helper, "harris_hawk", new BlockPos(2, 1, 2));
		hawk.tame(player);
		hawk.setHooded(true);
		helper.runAfterDelay(5, () -> {
			if (!hawk.isOrderedToSit() || !hawk.isHooded()) helper.fail("Hooded bird is not sitting");
			helper.succeed();
		});
	}
}
