import { equipSlots, equipWindow, type EquipSlotId } from "@/data/inventory-layout";
import type { SlotItem } from "@/data/items";
import { InventoryWindow } from "./inventory-window";
import { ItemSlot } from "./item-slot";

/** The Equipment Inventory: what the character is wearing, one item per slot */
export function EquipInventory({
  equipped,
}: {
  equipped: Partial<Record<EquipSlotId, SlotItem>>;
}) {
  return (
    <InventoryWindow title="Equipment Inventory" art={equipWindow}>
      <ul aria-label="Equipped items">
        {equipSlots.map((slot) => (
          <ItemSlot
            key={slot.id}
            slotId={slot.id}
            label={slot.label}
            x={slot.x}
            y={slot.y}
            item={equipped[slot.id]}
          />
        ))}
      </ul>
    </InventoryWindow>
  );
}
