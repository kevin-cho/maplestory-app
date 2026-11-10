// Where things sit on the inventory window art (public/inventory/, from
// scripts/fetch-inventory-ui.mjs), in the art's own pixels. The game's data
// has no slot coordinates (they're drawn into the art), so these are measured
// from the images. Every slot is 32×32.

const ASSETS = "/maplestory/inventory";

export const SLOT_SIZE = 32;

// --- Equipment Inventory ---

export const equipWindow = { src: `${ASSETS}/equip-window.png`, width: 175, height: 304 };

/** The equip grid: 5 columns × 7 rows, 33 px apart, though not every cell is a slot */
const EQUIP_GRID = { x: 5, y: 35, pitch: 33 };

export type EquipSlotId =
  | "cap" | "forehead" | "eye-acc" | "ear-acc" | "medal"
  | "mantle" | "clothes" | "pendant" | "weapon" | "shield"
  | "gloves" | "pants" | "belt" | "shoes"
  | "ring-1" | "ring-2" | "ring-3" | "ring-4"
  | "pet-mp" | "pet-hp" | "pet-acc" | "taming-mob" | "saddle" | "mob-equip";

export type EquipSlot = {
  id: EquipSlotId;
  /** The slot's name, as printed on the art */
  label: string;
  x: number;
  y: number;
  /**
   * The game's code for this slot (e.g. "Wp"), matched against an item's
   * `islots`. The four ring slots share "Ri". Slots without one (pet slots,
   * Mob Equip) take items the sample data can't place yet.
   */
  islot?: string;
};

const equipSlot = (id: EquipSlotId, label: string, col: number, row: number, islot?: string): EquipSlot => ({
  id,
  label,
  x: EQUIP_GRID.x + col * EQUIP_GRID.pitch,
  y: EQUIP_GRID.y + row * EQUIP_GRID.pitch,
  islot,
});

/** Every equip slot, in reading order (left to right, top to bottom) */
export const equipSlots: EquipSlot[] = [
  equipSlot("cap", "Cap", 1, 0, "Cp"),
  equipSlot("medal", "Medal", 0, 1, "Me"),
  equipSlot("forehead", "Forehead", 1, 1, "Af"),
  equipSlot("ring-1", "Ring", 3, 1, "Ri"),
  equipSlot("ring-2", "Ring", 4, 1, "Ri"),
  equipSlot("eye-acc", "Eye Acc", 2, 2, "Ay"),
  equipSlot("ear-acc", "Ear Acc", 3, 2, "Ae"),
  equipSlot("mantle", "Mantle", 0, 3, "Sr"),
  equipSlot("clothes", "Clothes", 1, 3, "Ma"),
  equipSlot("pendant", "Pendant", 2, 3, "Pe"),
  equipSlot("weapon", "Weapon", 3, 3, "Wp"),
  equipSlot("shield", "Shield", 4, 3, "Si"),
  equipSlot("gloves", "Gloves", 0, 4, "Gv"),
  equipSlot("pants", "Pants", 1, 4, "Pn"),
  equipSlot("belt", "Belt", 2, 4, "Be"),
  equipSlot("ring-3", "Ring", 3, 4, "Ri"),
  equipSlot("ring-4", "Ring", 4, 4, "Ri"),
  equipSlot("shoes", "Shoes", 2, 5, "So"),
  equipSlot("pet-mp", "Pet MP", 4, 5),
  equipSlot("taming-mob", "Taming Mob", 0, 6, "Tm"),
  equipSlot("saddle", "Saddle", 1, 6, "Sd"),
  equipSlot("mob-equip", "Mob Equip", 2, 6),
  equipSlot("pet-acc", "Pet Acc", 3, 6),
  equipSlot("pet-hp", "Pet HP", 4, 6),
];

type Wearable = { name: string; islots: readonly string[] };

/**
 * Puts each worn item in its equip slot, using the game's `islots`: the first
 * code is the slot the item is shown in (rings take the next free ring slot),
 * and any others are slots it also takes up. A bow (["Wp", "Si"]) leaves no
 * room for a shield, and an overall (["Ma", "Pn"]) none for pants.
 *
 * Throws if an item has no slot, or its slots are already taken, so a bad
 * outfit fails the build instead of an item quietly disappearing.
 */
export function wearItems<T extends Wearable>(items: readonly T[]): Partial<Record<EquipSlotId, T>> {
  const worn: Partial<Record<EquipSlotId, T>> = {};
  const takenBy = new Map<EquipSlotId, T>();

  for (const item of items) {
    const [shownIn, ...alsoTakes] = item.islots;
    const candidates = equipSlots.filter((slot) => slot.islot && slot.islot === shownIn);
    if (!candidates.length) {
      throw new Error(`No equip slot for ${item.name} (islots: ${JSON.stringify(item.islots)})`);
    }
    const slot = candidates.find((s) => !takenBy.has(s.id));
    if (!slot) {
      const other = takenBy.get(candidates[0].id)!;
      throw new Error(`Can't wear ${item.name}: ${candidates[0].label} is taken by ${other.name}`);
    }

    const blocked = alsoTakes.map((code) => {
      const other = equipSlots.find((s) => s.islot === code);
      if (!other) throw new Error(`Unknown slot code "${code}" on ${item.name}`);
      return other;
    });
    for (const other of blocked) {
      if (takenBy.has(other.id)) {
        throw new Error(`Can't wear ${item.name}: it needs the ${other.label} slot, taken by ${takenBy.get(other.id)!.name}`);
      }
    }

    worn[slot.id] = item;
    takenBy.set(slot.id, item);
    for (const other of blocked) takenBy.set(other.id, item);
  }
  return worn;
}

// --- Item Inventory ---

export const itemWindow = { src: `${ASSETS}/item-window.png`, width: 175, height: 289 };

/** The visible slot grid: 4 × 6 slots, 36 px apart across and 34 px down */
export const itemGrid = { x: 8, y: 50, cols: 4, rows: 6, pitchX: 36, pitchY: 34 };
export const ITEM_GRID_SLOTS = itemGrid.cols * itemGrid.rows;

export type ItemTabId = "equip" | "use" | "setup" | "etc" | "cash";

/**
 * Throws if a tab has more items than its 24 slots. There's no scrolling (the
 * app never needs it), so extra items would otherwise quietly go missing.
 */
export function checkTabsFit(items: Partial<Record<ItemTabId, readonly unknown[]>>): void {
  for (const [tab, list] of Object.entries(items)) {
    if (list.length > ITEM_GRID_SLOTS) {
      throw new Error(`The ${tab} tab has ${list.length} items, but only ${ITEM_GRID_SLOTS} fit (there's no scrolling)`);
    }
  }
}

/**
 * The tabs, in the game's order. The art's tab strip is blank: the row is built
 * from pieces (left end, a fill under each label, a join between tabs, right
 * end), with each label drawn on top. `width` is the fill under the label: the
 * label's width plus 2 px each side, so it isn't cramped by the slanted joins.
 */
export const itemTabs: { id: ItemTabId; label: string; width: number }[] = [
  { id: "equip", label: "Equip", width: 26 },
  { id: "use", label: "Use", width: 17 },
  { id: "setup", label: "Set-up", width: 30 },
  { id: "etc", label: "Etc", width: 17 },
  { id: "cash", label: "Cash", width: 24 },
];

/**
 * Where the tab row starts (it's 154 px wide, inside the art's strip at x
 * 5–170), and its pieces' sizes (UI/Basic.img/Tab2). The open tab's top edge
 * is 1 px higher than the others', so its label is raised by `openRaise`.
 */
export const tabRow = { x: 8, y: 23, height: 19, endWidth: 4, joinWidth: 8, labelTop: 5, openRaise: 1 };

/** The scrollbar, to the right of the grid and as tall as it (UI/Basic.img/VScr4) */
export const scrollbar = { x: 153, y: 50, width: 15, height: 202, arrowHeight: 13 };

/** The white box beside the coin, where the mesos amount goes */
export const mesosBox = { x: 25, y: 266, width: 114, height: 16 };

export const inventoryAsset = (path: string) => `${ASSETS}/${path}`;
