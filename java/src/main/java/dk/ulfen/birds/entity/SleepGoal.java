package dk.ulfen.birds.entity;

import java.util.EnumSet;

import net.minecraft.world.entity.ai.goal.Goal;

/** Roosts during the species' resting hours: night for most, day for owls. */
public class SleepGoal extends Goal {
	private final Raptor bird;

	public SleepGoal(Raptor bird) {
		this.bird = bird;
		this.setFlags(EnumSet.of(Goal.Flag.MOVE, Goal.Flag.LOOK, Goal.Flag.JUMP));
	}

	private boolean canSleepNow() {
		boolean restingTime = "day".equals(this.bird.species().sleeps()) ? this.bird.level().isBrightOutside() : this.bird.level().isDarkOutside();
		return restingTime && this.bird.onGround() && !this.bird.isInWater() && this.bird.getTarget() == null
			&& this.bird.getLastHurtByMob() == null && !this.bird.isCarrying();
	}

	@Override
	public boolean canUse() {
		return this.bird.getRandom().nextInt(reducedTickDelay(60)) == 0 && canSleepNow();
	}

	@Override
	public boolean canContinueToUse() {
		return canSleepNow();
	}

	@Override
	public void start() {
		this.bird.getNavigation().stop();
		this.bird.setResting(true);
	}

	@Override
	public void stop() {
		this.bird.setResting(false);
	}
}
