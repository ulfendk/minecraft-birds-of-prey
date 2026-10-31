package dk.ulfen.birds.item;

import dk.ulfen.birds.Falconry;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/** The falconer's glove with a trained bird on it: use it to fly the bird. */
public class GloveWithBirdItem extends Item {
	public GloveWithBirdItem(Item.Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (level instanceof ServerLevel server) Falconry.release(server, player, hand, player.getItemInHand(hand));
		return InteractionResult.SUCCESS;
	}
}
