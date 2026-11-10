import sampleItems from "./sample-items.json";
import scrolls from "./scrolls.json";

/** What an inventory slot needs to draw an item */
export type SlotItem = {
  id: number;
  name: string;
  /** The icon's URL */
  icon: string;
  /**
   * The icon's anchor point, [x, y] from its top-left. The game draws the icon
   * so this point lands on the slot's bottom-left corner, which keeps icons of
   * different sizes aligned.
   */
  iconOrigin: readonly number[];
};

export type SampleItem = (typeof sampleItems)[number];

/** A sample equip by ID (from scripts/fetch-inventory-ui.mjs); throws on a typo */
export function getSampleItem(id: number): SampleItem {
  const item = sampleItems.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown sample item: ${id}`);
  return item;
}

export function equipSlotItem(item: SampleItem): SlotItem {
  return {
    id: item.id,
    name: item.name,
    icon: `/maplestory/inventory/items/${item.id}.png`,
    iconOrigin: item.iconOrigin,
  };
}

/** A scroll by ID, as a slot item; throws on a typo */
export function scrollSlotItem(id: number): SlotItem {
  const scroll = scrolls.find((s) => s.id === id);
  if (!scroll) throw new Error(`Unknown scroll: ${id}`);
  return {
    id: scroll.id,
    name: scroll.name,
    icon: `/maplestory/scrolls/icons/${scroll.icon}.png`,
    iconOrigin: scroll.iconOrigin,
  };
}
