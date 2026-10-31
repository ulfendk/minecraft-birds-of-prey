package dk.ulfen.birds.item;

import dk.ulfen.birds.BirdGuide;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.Level;

/** Shows the birds you have seen (in chat; hover a name to read about it). */
public class BirdGuideItem extends Item {
	public BirdGuideItem(Item.Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		player.playSound(SoundEvents.BOOK_PAGE_TURN, 1.0F, 1.0F);
		if (player instanceof ServerPlayer sp) BirdGuide.show(sp);
		return InteractionResult.SUCCESS;
	}
}
