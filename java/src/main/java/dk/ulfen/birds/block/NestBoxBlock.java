package dk.ulfen.birds.block;

import java.util.List;

import dk.ulfen.birds.BirdsRegistry;
import dk.ulfen.birds.entity.Raptor;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A nest box: now and then a pair of kestrels (by day) or owls (by night) moves in,
 * and a pair living there raises chicks. Mirrors scripts/nestboxes.js.
 */
public class NestBoxBlock extends FacingBlock {
	private static final VoxelShape SHAPE = Block.box(1, 0, 1, 15, 16, 15);

	public NestBoxBlock(Properties properties) {
		super(properties);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		if (random.nextInt(4) != 0) return;
		List<ServerPlayer> players = level.getEntitiesOfClass(ServerPlayer.class, new AABB(pos).inflate(64));
		if (players.isEmpty()) return;
		AABB around = new AABB(pos).inflate(12);
		List<Raptor> residents = level.getEntitiesOfClass(Raptor.class, around, b -> b.species().nestBox());
		if (residents.isEmpty()) {
			boolean night = level.isDarkOutside();
			List<Species> options = new java.util.ArrayList<>();
			SpeciesRegistry.all().forEach(s -> { if (s.nestBox() && s.isOwl() == night) options.add(s); });
			if (options.isEmpty()) return;
			Species pick = options.get(random.nextInt(options.size()));
			for (int i = 0; i < 2; i++) spawn(level, pos, pick, false);
			players.forEach(p -> p.sendSystemMessage(Component.translatable("birds.nest.moved_in", Component.translatable("entity.birds." + pick.id()))));
			return;
		}
		Species s = residents.get(0).species();
		long adults = residents.stream().filter(b -> b.species() == s && !b.isBaby()).count();
		long young = residents.stream().filter(Raptor::isBaby).count();
		if (adults >= 2 && young < 2 && random.nextInt(6) == 0) {
			spawn(level, pos, s, true);
			level.playSound(null, pos, SoundEvents.TURTLE_EGG_CRACK, SoundSource.BLOCKS, 1.0F, 1.2F);
			players.forEach(p -> p.sendSystemMessage(Component.translatable("birds.nest.chick")));
		}
	}

	private static void spawn(ServerLevel level, BlockPos pos, Species s, boolean baby) {
		if (!(BirdsRegistry.BIRDS.get(s.id()).create(level, EntitySpawnReason.BREEDING) instanceof Raptor bird)) return;
		bird.snapTo(pos.getX() + 0.5, pos.getY() + 1.1, pos.getZ() + 0.5, level.getRandom().nextFloat() * 360, 0);
		if (baby) bird.setAge(AgeableMob.BABY_START_AGE);
		level.addFreshEntity(bird);
	}
}
