package dk.ulfen.birds.client;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.BoneSnapshots;
import com.geckolib.renderer.base.RenderPassInfo;

import dk.ulfen.birds.entity.Raptor;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.entity.EntityType;
import org.jspecify.annotations.Nullable;

/** Renders a bird from its GeckoLib model; the hood and the catch only show when worn or carried. */
public class RaptorRenderer extends GeoEntityRenderer<Raptor, LivingEntityRenderState> {
	private static final DataTicket<Boolean> HOODED = DataTicket.create("birds_hooded", Boolean.class);
	private static final DataTicket<Boolean> CARRYING = DataTicket.create("birds_carrying", Boolean.class);

	public RaptorRenderer(EntityRendererProvider.Context context, EntityType<Raptor> type) {
		super(context, new DefaultedEntityGeoModel<>(BuiltInRegistries.ENTITY_TYPE.getKey(type)));
		Species species = SpeciesRegistry.of(type);
		this.shadowRadius = Math.min(1.0F, species.width() * species.scale() * 0.4F);
	}

	@Override
	public void captureDefaultRenderState(Raptor animatable, @Nullable Void relatedObject, LivingEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(animatable, relatedObject, state, partialTick);
		state.addGeckolibData(HOODED, animatable.isHooded());
		state.addGeckolibData(CARRYING, animatable.isCarrying());
	}

	@Override
	public void adjustModelBonesForRender(RenderPassInfo<LivingEntityRenderState> info, BoneSnapshots snapshots) {
		hide(snapshots, "hood", !info.getOrDefaultGeckolibData(HOODED, false));
		hide(snapshots, "prey", !info.getOrDefaultGeckolibData(CARRYING, false));
	}

	private static void hide(BoneSnapshots snapshots, String bone, boolean hidden) {
		snapshots.get(bone).ifPresent(b -> b.skipRender(hidden).skipChildrenRender(hidden));
	}
}
