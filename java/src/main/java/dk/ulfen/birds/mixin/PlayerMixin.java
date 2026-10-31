package dk.ulfen.birds.mixin;

import dk.ulfen.birds.BirdsRegistry;
import net.minecraft.world.entity.player.Player;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/** Binoculars zoom in like the spyglass (the game only checks for the spyglass itself). */
@Mixin(Player.class)
public abstract class PlayerMixin {
	@Inject(method = "isScoping", at = @At("RETURN"), cancellable = true)
	private void birds$binoculars(CallbackInfoReturnable<Boolean> cir) {
		Player self = (Player) (Object) this;
		if (!cir.getReturnValueZ() && self.isUsingItem() && self.getUseItem().is(BirdsRegistry.BINOCULARS)) cir.setReturnValue(true);
	}
}
