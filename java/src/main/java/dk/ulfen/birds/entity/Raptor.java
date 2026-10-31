package dk.ulfen.birds.entity;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.animation.object.PlayState;
import com.geckolib.constant.DataTickets;
import com.geckolib.util.GeckoLibUtil;

import dk.ulfen.birds.BirdsRegistry;
import dk.ulfen.birds.Falconry;
import dk.ulfen.birds.Hides;
import dk.ulfen.birds.Ringing;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.TamableAnimal;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.control.FlyingMoveControl;
import net.minecraft.world.entity.ai.goal.AvoidEntityGoal;
import net.minecraft.world.entity.ai.goal.BreedGoal;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.FollowOwnerGoal;
import net.minecraft.world.entity.ai.goal.FollowParentGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.SitWhenOrderedToGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomFlyingGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtTargetGoal;
import net.minecraft.world.entity.ai.navigation.FlyingPathNavigation;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.ServerLevelAccessor;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

/** Every bird of prey. Behaviour comes from its {@link Species}. */
public class Raptor extends TamableAnimal implements GeoEntity {
	private static final EntityDataAccessor<Boolean> RESTING = SynchedEntityData.defineId(Raptor.class, EntityDataSerializers.BOOLEAN);
	private static final EntityDataAccessor<Boolean> HOODED = SynchedEntityData.defineId(Raptor.class, EntityDataSerializers.BOOLEAN);
	private static final EntityDataAccessor<Boolean> CARRYING = SynchedEntityData.defineId(Raptor.class, EntityDataSerializers.BOOLEAN);
	/** Raw meat: tames falconry birds, feeds and breeds them all. */
	private static final Set<String> MEAT = Set.of("minecraft:rabbit", "minecraft:chicken", "minecraft:beef", "minecraft:mutton", "minecraft:porkchop");
	/** One-shot animations the server can trigger. */
	private static final String[] ACTIONS = {"attack", "stamp", "call"};

	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private final List<ItemStack> catchItems = new ArrayList<>();
	private int carryTicks;
	private int pelletTime;
	private int diveCooldown;
	private @Nullable String ring;

	public Raptor(EntityType<? extends Raptor> type, Level level) {
		super(type, level);
		if (species().flies()) this.moveControl = new FlyingMoveControl(this, 20, true);
		this.pelletTime = this.random.nextInt(12000) + 12000;
		this.refreshDimensions(); // apply the species' size multiplier (scale attribute) to the hitbox
	}

	public static AttributeSupplier.Builder createAttributes(Species s) {
		return TamableAnimal.createAnimalAttributes()
			.add(Attributes.MAX_HEALTH, s.health())
			.add(Attributes.MOVEMENT_SPEED, s.speed())
			.add(Attributes.FLYING_SPEED, s.flySpeed() * 2.5)
			.add(Attributes.ATTACK_DAMAGE, s.attackDamage())
			.add(Attributes.FOLLOW_RANGE, Math.max(32, s.huntRange() + 8))
			.add(Attributes.SCALE, s.scale());
	}

	public Species species() {
		return SpeciesRegistry.of(this.getType());
	}

	public String speciesId() {
		return species().id();
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(RESTING, false);
		builder.define(HOODED, false);
		builder.define(CARRYING, false);
	}

	@Override
	protected PathNavigation createNavigation(Level level) {
		if (SpeciesRegistry.of(this.getType()).walks()) return super.createNavigation(level);
		FlyingPathNavigation nav = new FlyingPathNavigation(this, level);
		nav.setCanOpenDoors(false);
		nav.setCanFloat(true);
		return nav;
	}

	@Override
	protected void registerGoals() {
		Species s = species();
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new SitWhenOrderedToGoal(this));
		// Wild birds keep their distance from people, unless they sneak or sit in a hide.
		this.goalSelector.addGoal(2, new AvoidEntityGoal<>(this, Player.class, s.shy(), 1.2, 1.5,
			p -> !this.isTame() && p instanceof Player pl && !pl.isShiftKeyDown() && !Hides.isHidden(pl) && !pl.isSpectator()));
		this.goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.5, true));
		this.goalSelector.addGoal(4, new FollowOwnerGoal(this, 1.4, 12.0F, 4.0F));
		this.goalSelector.addGoal(5, new BreedGoal(this, 1.0));
		this.goalSelector.addGoal(5, new FollowParentGoal(this, 1.1));
		this.goalSelector.addGoal(6, new SleepGoal(this));
		if (s.flies()) this.goalSelector.addGoal(8, new WaterAvoidingRandomFlyingGoal(this, 1.0));
		else this.goalSelector.addGoal(8, new WaterAvoidingRandomStrollGoal(this, 0.8));
		this.goalSelector.addGoal(9, new LookAtPlayerGoal(this, Player.class, 8.0F));
		this.goalSelector.addGoal(10, new RandomLookAroundGoal(this));

		this.targetSelector.addGoal(1, new OwnerHurtByTargetGoal(this));
		this.targetSelector.addGoal(2, new OwnerHurtTargetGoal(this));
		HurtByTargetGoal hurtBy = new HurtByTargetGoal(this);
		if (s.alertsPack()) hurtBy.setAlertOthers();
		this.targetSelector.addGoal(3, hurtBy);
		if (!s.hunts().isEmpty()) {
			Set<String> prey = new HashSet<>(s.hunts());
			// Wild birds hunt on their own; a trained bird only goes after what it's flown at.
			this.targetSelector.addGoal(4, new NearestAttackableTargetGoal<>(this, LivingEntity.class, 60, true, false,
				(target, level) -> !this.isTame() && !this.isResting() && !this.isBaby()
					&& prey.contains(BuiltInRegistries.ENTITY_TYPE.getKey(target.getType()).toString())
					&& target.distanceTo(this) <= s.huntRange()));
		}
	}

	// ---------------------------------------------------------------- breeding and taming

	private static boolean isMeat(ItemStack stack) {
		return MEAT.contains(BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
	}

	@Override
	public boolean isFood(ItemStack stack) {
		return isMeat(stack);
	}

	@Override
	public @Nullable AgeableMob getBreedOffspring(ServerLevel level, AgeableMob partner) {
		return (AgeableMob) this.getType().create(level, EntitySpawnReason.BREEDING);
	}

	@Override
	public InteractionResult mobInteract(Player player, InteractionHand hand) {
		ItemStack held = player.getItemInHand(hand);
		boolean server = !this.level().isClientSide();
		if (held.is(BirdsRegistry.FALCONER_GLOVE) && species().falconry() && this.isTame()) {
			if (server) {
				if (this.isOwnedBy(player)) Falconry.pickUp(player, this, hand);
				else player.sendOverlayMessage(Component.translatable("birds.falconry.not_yours"));
			}
			return InteractionResult.SUCCESS;
		}
		if (held.is(BirdsRegistry.FALCONRY_HOOD) && this.isTame() && this.isOwnedBy(player)) {
			if (server) {
				setHooded(!isHooded());
				this.playSound(SoundEvents.ARMOR_EQUIP_LEATHER.value(), 1.0F, 1.0F);
				player.sendOverlayMessage(Component.translatable(isHooded() ? "birds.falconry.hooded" : "birds.falconry.unhooded"));
			}
			return InteractionResult.SUCCESS;
		}
		if (held.is(BirdsRegistry.BIRD_RING)) {
			if (server) Ringing.fit(player, this, held);
			return InteractionResult.SUCCESS;
		}
		if (isMeat(held) && species().falconry() && !this.isTame() && !this.isBaby()) {
			if (this.level() instanceof ServerLevel level) {
				held.consume(1, player);
				if (this.random.nextFloat() < species().tameChance()) {
					this.tame(player);
					this.navigation.stop();
					this.setTarget(null);
					level.broadcastEntityEvent(this, (byte) 7);
					player.sendOverlayMessage(Component.translatable("birds.falconry.tamed", this.getDisplayName()));
				} else {
					level.broadcastEntityEvent(this, (byte) 6);
				}
			}
			return InteractionResult.SUCCESS;
		}
		if (isMeat(held) && this.isTame() && this.getHealth() < this.getMaxHealth()) {
			if (server) {
				held.consume(1, player);
				this.heal(4.0F);
			}
			return InteractionResult.SUCCESS;
		}
		return super.mobInteract(player, hand);
	}

	// ---------------------------------------------------------------- state

	/** A snake's bite can't get through the secretary bird's leg scales. */
	@Override
	public boolean canBeAffected(MobEffectInstance effect) {
		if (this.species().venomProof() && effect.is(MobEffects.POISON)) return false;
		return super.canBeAffected(effect);
	}

	public boolean isResting() {
		return this.entityData.get(RESTING);
	}

	public void setResting(boolean resting) {
		this.entityData.set(RESTING, resting);
	}

	public boolean isHooded() {
		return this.entityData.get(HOODED);
	}

	public void setHooded(boolean hooded) {
		this.entityData.set(HOODED, hooded);
		this.setOrderedToSit(hooded);
		this.setInSittingPose(hooded);
		if (hooded) this.navigation.stop();
	}

	public boolean isCarrying() {
		return this.entityData.get(CARRYING);
	}

	public @Nullable String ring() {
		return this.ring;
	}

	public void setRing(@Nullable String ring) {
		this.ring = ring;
		if (ring != null) this.setPersistenceRequired();
	}

	/** Picks up the catch to bring home to the falconer. */
	public void startCarrying(List<ItemStack> items) {
		this.catchItems.addAll(items);
		this.carryTicks = 1200;
		this.entityData.set(CARRYING, true);
	}

	/** Hands the catch over (or drops it where the bird is when there's nobody to give it to). */
	public void deliverCatch(@Nullable Player player) {
		if (!isCarrying()) return;
		for (ItemStack item : this.catchItems) {
			if (player == null || !player.getInventory().add(item)) this.spawnAtLocation((ServerLevel) this.level(), item);
		}
		if (player != null && !this.catchItems.isEmpty()) player.sendOverlayMessage(Component.translatable("birds.falconry.returned", this.getDisplayName()));
		this.catchItems.clear();
		this.entityData.set(CARRYING, false);
	}

	@Override
	public void aiStep() {
		super.aiStep();
		if (this.isResting() || this.isHooded()) this.getNavigation().stop();
		if (!(this.level() instanceof ServerLevel level)) return;
		Species s = species();
		if (isCarrying()) {
			LivingEntity owner = this.getOwner();
			if (owner instanceof Player p && p.distanceTo(this) < 4.0F) deliverCatch(p);
			else if (--this.carryTicks <= 0) deliverCatch(null);
		}
		if (this.diveCooldown > 0) this.diveCooldown--;
		if ((s.stoops() || (s.fishes() && s.hovers())) && !this.onGround()) dive();
		if (s.dropsBones() && !this.onGround() && this.random.nextInt(2000) == 0) dropBone(level);
		if (s.pellets() && !this.isBaby() && --this.pelletTime <= 0) {
			this.spawnAtLocation(level, BirdsRegistry.OWL_PELLET);
			this.playSound(SoundEvents.CHICKEN_EGG, 1.0F, 0.7F);
			this.pelletTime = this.random.nextInt(12000) + 12000;
		}
	}

	/** A falcon's stoop or an osprey's plunge: fold up and drop onto the target from on high. */
	private void dive() {
		LivingEntity target = this.getTarget();
		if (target == null || this.diveCooldown > 0 || this.getY() - target.getY() < 5) return;
		Vec3 to = target.position().subtract(this.position()).normalize().scale(1.6);
		this.setDeltaMovement(to);
		this.diveCooldown = 160;
	}

	/** The lammergeier drops a bone from the sky; it shatters into bone meal where it lands. */
	private void dropBone(ServerLevel level) {
		BlockPos ground = level.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING, this.blockPosition());
		level.addFreshEntity(new ItemEntity(level, ground.getX() + 0.5, ground.getY() + 0.2, ground.getZ() + 0.5, new ItemStack(Items.BONE_MEAL, 2)));
		level.playSound(null, ground, SoundEvents.BONE_BLOCK_BREAK, SoundSource.NEUTRAL, 1.0F, 0.8F);
	}

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float damage) {
		setResting(false);
		return super.hurtServer(level, source, damage);
	}

	@Override
	public boolean doHurtTarget(ServerLevel level, Entity target) {
		playAction(species().walks() ? "stamp" : "attack");
		return super.doHurtTarget(level, target);
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource source) {
		return false;
	}

	@Override
	public boolean removeWhenFarAway(double distance) {
		return !this.isTame() && this.ring == null && super.removeWhenFarAway(distance);
	}

	// ---------------------------------------------------------------- sounds

	private static @Nullable SoundEvent sound(@Nullable String id) {
		return id == null ? null : BuiltInRegistries.SOUND_EVENT.getValue(Identifier.parse(id));
	}

	@Override
	protected @Nullable SoundEvent getAmbientSound() {
		return isResting() ? null : sound(species().sounds().ambient());
	}

	@Override
	protected @Nullable SoundEvent getHurtSound(DamageSource source) {
		return sound(species().sounds().hurt());
	}

	@Override
	protected @Nullable SoundEvent getDeathSound() {
		return sound(species().sounds().death());
	}

	@Override
	public int getAmbientSoundInterval() {
		return species().sounds().interval() * 20;
	}

	@Override
	public float getVoicePitch() {
		Species.Sounds s = species().sounds();
		float pitch = s.pitchMin() + this.random.nextFloat() * (s.pitchMax() - s.pitchMin());
		return this.isBaby() ? pitch * 1.3F : pitch;
	}

	// ---------------------------------------------------------------- saving

	@Override
	protected void addAdditionalSaveData(ValueOutput output) {
		super.addAdditionalSaveData(output);
		output.putBoolean("Hooded", isHooded());
		output.putInt("PelletTime", this.pelletTime);
		if (this.ring != null) output.putString("Ring", this.ring);
	}

	@Override
	protected void readAdditionalSaveData(ValueInput input) {
		super.readAdditionalSaveData(input);
		this.entityData.set(HOODED, input.getBooleanOr("Hooded", false));
		this.pelletTime = input.getIntOr("PelletTime", 12000);
		this.ring = input.getString("Ring").orElse(null);
	}

	// ---------------------------------------------------------------- GeckoLib

	/** Play a one-shot animation on all clients, if this species has it. */
	public void playAction(String name) {
		if (species().hasAnimation(name)) triggerAnim("action", name);
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		Species s = species();
		controllers.add(new AnimationController<Raptor>("move", 4, state -> {
			Raptor e = state.animatable();
			Vec3 v = state.getDataOrDefault(DataTickets.VELOCITY, Vec3.ZERO);
			String anim = pickMove(e, s, Math.sqrt(v.x * v.x + v.z * v.z) * 20, v.y * 20);
			if (anim == null) return PlayState.STOP;
			return state.setAndContinue(RawAnimation.begin().thenLoop(s.animation(anim)));
		}));
		AnimationController<Raptor> action = new AnimationController<>("action", 2, state -> PlayState.STOP);
		for (String name : ACTIONS) {
			if (s.hasAnimation(name)) action.triggerableAnim(name, RawAnimation.begin().thenPlay(s.animation(name)));
		}
		controllers.add(action);
	}

	/** The same posture states as the Bedrock animation controller (src/lib/client.mjs moveStates). */
	private static @Nullable String pickMove(Raptor e, Species s, double groundSpeed, double verticalSpeed) {
		boolean air = !e.onGround() && !e.isInWater() && !e.isInSittingPose();
		if (e.isResting()) return "sleep";
		if (air && verticalSpeed < -7) return "stoop";
		if (air && groundSpeed < (s.hovers() ? 2.5 : 0.8)) return "hover";
		if (air && verticalSpeed < (s.soars() ? 0.6 : -0.6)) return "glide";
		if (air) return "fly";
		if (e.isCarrying()) return "eat";
		if (groundSpeed > 0.4) return "walk";
		return "idle";
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return this.geoCache;
	}

	/** Spawn rule: on solid ground or in a tree, with some daylight (owls also at night). */
	public static boolean checkSpawn(EntityType<? extends Mob> type, ServerLevelAccessor level, EntitySpawnReason reason, BlockPos pos, RandomSource random) {
		BlockPos below = pos.below();
		boolean solid = level.getBlockState(below).isFaceSturdy(level, below, net.minecraft.core.Direction.UP) || level.getBlockState(below).is(net.minecraft.tags.BlockTags.LEAVES);
		boolean owl = SpeciesRegistry.of(type).isOwl();
		return solid && (owl || level.getRawBrightness(pos, 0) > 8);
	}
}
