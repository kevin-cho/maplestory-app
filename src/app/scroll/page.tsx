import type { Metadata } from "next";
import { EquipInventory } from "@/components/inventory/equip-inventory";
import { ItemInventory } from "@/components/inventory/item-inventory";
import { wearItems } from "@/data/inventory-layout";
import { equipSlotItem, getSampleItem, scrollSlotItem } from "@/data/items";
import { getTool } from "@/data/tools";

const tool = getTool("scroll");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

// Sample contents until the simulator has real ones: a classic outfit worn,
// Maple weapons in the Equip tab and a few scrolls in the Use tab.
const WORN = [
  1002357, 1012000, 1022000, 1032000, 1040002, 1060002, 1072001, 1082002, 1092030, 1102000, 1122000,
  1302000,
];
const EQUIP_TAB = [1302020, 1332025, 1382009, 1452022, 1472030];
const USE_TAB = [2040001, 2040002, 2044501, 2049100, 2040727];

// Throws if an item has no slot or two items need the same one
const equipped = Object.fromEntries(
  Object.entries(wearItems(WORN.map(getSampleItem))).map(([slot, item]) => [slot, equipSlotItem(item)]),
);

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{tool.name}</h1>
        <p className="mt-2 text-muted-foreground">{tool.description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <EquipInventory equipped={equipped} />
        <ItemInventory
          mesos={1234567}
          items={{
            equip: EQUIP_TAB.map((id) => equipSlotItem(getSampleItem(id))),
            use: USE_TAB.map(scrollSlotItem),
          }}
        />
      </div>
    </main>
  );
}
