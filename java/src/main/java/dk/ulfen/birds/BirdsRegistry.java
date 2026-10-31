package dk.ulfen.birds;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

import dk.ulfen.birds.block.FacingBlock;
import dk.ulfen.birds.block.NestBoxBlock;
import dk.ulfen.birds.entity.Raptor;
import dk.ulfen.birds.item.BinocularsItem;
import dk.ulfen.birds.item.BirdGuideItem;
import dk.ulfen.birds.item.GearItem;
import dk.ulfen.birds.item.GloveWithBirdItem;
import dk.ulfen.birds.species.Species;
import dk.ulfen.birds.species.SpeciesRegistry;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.SpawnPlacementTypes;
import net.minecraft.world.entity.SpawnPlacements;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.levelgen.Heightmap;
import net.minecraft.world.level.material.MapColor;

/** Everything the mod adds to the game registries. */
public final class BirdsRegistry {
	public static final Map<String, EntityType<? extends Mob>> BIRDS = new LinkedHashMap<>();
	public static final Map<String, Item> SPAWN_EGGS = new LinkedHashMap<>();

	public static Block BIRD_HIDE;
	public static Block NEST_BOX;

	public static Item BIRD_GUIDE;
	public static Item BINOCULARS;
	public static Item FALCONER_GLOVE;
	public static Item GLOVE_WITH_BIRD;
	public static Item FALCONRY_HOOD;
	public static Item FALCONRY_LURE;
	public static Item BIRD_CALL;
	public static Item BIRD_RING;
	public static Item OWL_PELLET;
	public static Item CONTEST_HORN;
	public static Item GOLDEN_RAPTOR;

	private BirdsRegistry() {}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(BirdsOfPrey.MOD_ID, path);
	}

	static void register() {
		registerEntities();
		registerBlocks();
		registerItems();
		registerCreativeTab();
	}

	private static <T extends net.minecraft.world.entity.Entity> EntityType<T> entity(String name, EntityType.Builder<T> builder) {
		ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, id(name));
		return Registry.register(BuiltInRegistries.ENTITY_TYPE, key, builder.build(key));
	}

	private static void registerEntities() {
		for (Species s : SpeciesRegistry.all()) {
			EntityType<Raptor> t = entity(s.id(), EntityType.Builder.<Raptor>of(Raptor::new, MobCategory.CREATURE).sized(s.width(), s.height()).clientTrackingRange(10));
			FabricDefaultAttributeRegistry.register(t, Raptor.createAttributes(s));
			SpawnPlacements.register(t, s.flies() ? SpawnPlacementTypes.NO_RESTRICTIONS : SpawnPlacementTypes.ON_GROUND, Heightmap.Types.MOTION_BLOCKING, Raptor::checkSpawn);
			BIRDS.put(s.id(), t);
		}
	}

	private static Block block(String name, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, id(name));
		Block block = Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(props.setId(key)));
		item(name, p -> new BlockItem(block, p), new Item.Properties().useBlockDescriptionPrefix());
		return block;
	}

	private static void registerBlocks() {
		BIRD_HIDE = block("bird_hide", FacingBlock::new, BlockBehaviour.Properties.of()
			.mapColor(MapColor.PLANT).strength(1.0F).sound(SoundType.WOOD).noOcclusion().ignitedByLava());
		NEST_BOX = block("nest_box", NestBoxBlock::new, BlockBehaviour.Properties.of()
			.mapColor(MapColor.WOOD).strength(1.0F).sound(SoundType.WOOD).noOcclusion().randomTicks().ignitedByLava());
	}

	private static <T extends Item> T item(String name, Function<Item.Properties, T> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}

	private static Item gear(String name, GearItem.Kind kind, int stack) {
		return item(name, p -> new GearItem(p, kind), new Item.Properties().stacksTo(stack));
	}

	private static void registerItems() {
		for (Species s : SpeciesRegistry.all()) {
			SPAWN_EGGS.put(s.id(), item(s.id() + "_spawn_egg", net.minecraft.world.item.SpawnEggItem::new, new Item.Properties().spawnEgg(BIRDS.get(s.id()))));
		}
		BIRD_GUIDE = item("bird_guide", BirdGuideItem::new, new Item.Properties().stacksTo(1));
		BINOCULARS = item("binoculars", BinocularsItem::new, new Item.Properties().stacksTo(1));
		FALCONER_GLOVE = item("falconer_glove", Item::new, new Item.Properties().stacksTo(1));
		GLOVE_WITH_BIRD = item("glove_with_bird", GloveWithBirdItem::new, new Item.Properties().stacksTo(1));
		FALCONRY_HOOD = item("falconry_hood", Item::new, new Item.Properties().stacksTo(16));
		FALCONRY_LURE = gear("falconry_lure", GearItem.Kind.LURE, 1);
		BIRD_CALL = gear("bird_call", GearItem.Kind.CALL, 1);
		BIRD_RING = item("bird_ring", Item::new, new Item.Properties());
		OWL_PELLET = gear("owl_pellet", GearItem.Kind.PELLET, 64);
		CONTEST_HORN = gear("contest_horn", GearItem.Kind.HORN, 1);
		GOLDEN_RAPTOR = item("golden_raptor", Item::new, new Item.Properties().stacksTo(16).component(DataComponents.ENCHANTMENT_GLINT_OVERRIDE, true));
	}

	private static void registerCreativeTab() {
		CreativeModeTab tab = FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.birds"))
			.icon(() -> new ItemStack(SPAWN_EGGS.get("peregrine_falcon")))
			.displayItems((params, out) -> {
				SPAWN_EGGS.values().forEach(out::accept);
				for (Item i : new Item[] {BIRD_GUIDE, BINOCULARS, FALCONER_GLOVE, FALCONRY_HOOD, FALCONRY_LURE, BIRD_CALL, BIRD_RING, CONTEST_HORN, OWL_PELLET, GOLDEN_RAPTOR}) out.accept(i);
				out.accept(BIRD_HIDE);
				out.accept(NEST_BOX);
			})
			.build();
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, id("birds"), tab);
	}
}
