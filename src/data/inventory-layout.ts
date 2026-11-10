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
  /** The game's code for this slot: an item fits it if its `islots` has it */
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
  equipSlot("medal", "Medal", 0, 1),
  equipSlot("forehead", "Forehead", 1, 1, "Af"),
  equipSlot("ring-1", "Ring", 3, 1),
  equipSlot("ring-2", "Ring", 4, 1),
  equipSlot("eye-acc", "Eye Acc", 2, 2, "Ay"),
  equipSlot("ear-acc", "Ear Acc", 3, 2, "Ae"),
  equipSlot("mantle", "Mantle", 0, 3, "Sr"),
  equipSlot("clothes", "Clothes", 1, 3, "Ma"),
  equipSlot("pendant", "Pendant", 2, 3, "Pe"),
  equipSlot("weapon", "Weapon", 3, 3, "Wp"),
  equipSlot("shield", "Shield", 4, 3, "Si"),
  equipSlot("gloves", "Gloves", 0, 4, "Gv"),
  equipSlot("pants", "Pants", 1, 4, "Pn"),
  equipSlot("belt", "Belt", 2, 4),
  equipSlot("ring-3", "Ring", 3, 4),
  equipSlot("ring-4", "Ring", 4, 4),
  equipSlot("shoes", "Shoes", 2, 5, "So"),
  equipSlot("pet-mp", "Pet MP", 4, 5),
  equipSlot("taming-mob", "Taming Mob", 0, 6),
  equipSlot("saddle", "Saddle", 1, 6),
  equipSlot("mob-equip", "Mob Equip", 2, 6),
  equipSlot("pet-acc", "Pet Acc", 3, 6),
  equipSlot("pet-hp", "Pet HP", 4, 6),
];

/** The slot an item is worn in, from its `islots` (e.g. ["Wp"] → weapon) */
export function equipSlotFor(islots: readonly string[]): EquipSlotId | undefined {
  return equipSlots.find((slot) => slot.islot && slot.islot === islots[0])?.id;
}

// --- Item Inventory ---

export const itemWindow = { src: `${ASSETS}/item-window.png`, width: 175, height: 289 };

/** The visible slot grid: 4 × 6 slots, 36 px apart across and 34 px down */
export const itemGrid = { x: 8, y: 50, cols: 4, rows: 6, pitchX: 36, pitchY: 34 };
export const ITEM_GRID_SLOTS = itemGrid.cols * itemGrid.rows;

export type ItemTabId = "equip" | "use" | "setup" | "etc" | "cash";

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
