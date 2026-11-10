import { SLOT_SIZE } from "@/data/inventory-layout";
import type { SlotItem } from "@/data/items";
import { Sprite } from "./sprite";

/**
 * One inventory slot, placed at (x, y) in the window's art. Its icon is drawn
 * the way the game does: the icon's origin lands on the slot's bottom-left
 * corner. Icons are up to ~37 px, so some overhang the 32 px slot slightly,
 * as in the game.
 *
 * `data-slot` and the accessible name (e.g. "Cap") identify the slot, so
 * hover, click and drag can be added later without changing the markup.
 */
export function ItemSlot({
  slotId,
  label,
  x,
  y,
  item,
}: {
  slotId: string;
  label: string;
  x: number;
  y: number;
  item?: SlotItem;
}) {
  return (
    <li
      data-slot={slotId}
      aria-label={label}
      className="absolute"
      style={{ left: x, top: y, width: SLOT_SIZE, height: SLOT_SIZE }}
    >
      {item && (
        <Sprite
          src={item.icon}
          alt={item.name}
          x={-item.iconOrigin[0]}
          y={SLOT_SIZE - item.iconOrigin[1]}
        />
      )}
    </li>
  );
}
