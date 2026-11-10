"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ITEM_GRID_SLOTS,
  checkTabsFit,
  inventoryAsset,
  itemGrid,
  itemTabs,
  itemWindow,
  mesosBox,
  scrollbar,
  tabRow,
  type ItemTabId,
} from "@/data/inventory-layout";
import type { SlotItem } from "@/data/items";
import { InventoryWindow } from "./inventory-window";
import { ItemSlot } from "./item-slot";
import { Sprite } from "./sprite";

const tabPiece = (name: string) => inventoryAsset(`tabs/frame-${name}.png`);

/**
 * The Item Inventory: five tabs of items, a 4 × 6 grid of slots, and mesos.
 * Each tab's items fill its slots in order. The app never needs more than 24
 * per tab, so there's no scrolling: the scrollbar is always greyed out, as in
 * the game when everything fits. More than 24 items in a tab throws, so items
 * can't quietly go missing.
 */
export function ItemInventory({
  items,
  mesos,
  initialTab = "equip",
}: {
  items: Partial<Record<ItemTabId, SlotItem[]>>;
  mesos: number;
  initialTab?: ItemTabId;
}) {
  checkTabsFit(items);
  const [selected, setSelected] = useState<ItemTabId>(initialTab);
  const id = useId();
  const tabRefs = useRef<Partial<Record<ItemTabId, HTMLButtonElement | null>>>({});
  const tabItems = items[selected] ?? [];

  // Arrow keys move between tabs, as in the ARIA tabs pattern
  const onKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = itemTabs.findIndex((t) => t.id === selected);
    const next = itemTabs[(index + step + itemTabs.length) % itemTabs.length].id;
    setSelected(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <InventoryWindow title="Item Inventory" art={itemWindow}>
      {/* The tab row: left end, then each tab (a fill under its label) with a
          join after it, and the right end in place of the last join. Each
          piece has an unselected (0) and selected (1) image; the joins next
          to the selected tab are middle2 (going into it) and middle1 (out). */}
      <div
        role="tablist"
        aria-label="Item types"
        onKeyDown={onKeyDown}
        className="absolute flex"
        style={{ left: tabRow.x, top: tabRow.y, height: tabRow.height }}
      >
        {itemTabs.map((tab, i) => {
          const on = tab.id === selected;
          const next = itemTabs[i + 1];
          const join = !next
            ? `right${on ? 1 : 0}`
            : on
              ? "middle1"
              : next.id === selected
                ? "middle2"
                : "middle0";
          return (
            <div key={tab.id} className="flex">
              {i === 0 && <Sprite src={tabPiece(`left${on ? 1 : 0}`)} />}
              <button
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${tab.id}`}
                aria-selected={on}
                aria-controls={`${id}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setSelected(tab.id)}
                className="relative flex items-start justify-center focus-visible:outline-1 focus-visible:outline-black"
                style={{
                  width: tab.width,
                  height: tabRow.height,
                  paddingTop: tabRow.labelTop - (on ? tabRow.openRaise : 0),
                  backgroundImage: `url(${tabPiece(`fill${on ? 1 : 0}`)})`,
                }}
              >
                <Sprite
                  src={inventoryAsset(`tabs/${tab.id}.png`)}
                  alt={tab.label}
                />
              </button>
              <Sprite src={tabPiece(join)} />
            </div>
          );
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${selected}`}>
        <ul aria-label="Slots">
          {Array.from({ length: ITEM_GRID_SLOTS }, (_, i) => (
            <ItemSlot
              key={i}
              slotId={`${selected}-${i + 1}`}
              label={`Slot ${i + 1}`}
              x={itemGrid.x + (i % itemGrid.cols) * itemGrid.pitchX}
              y={itemGrid.y + Math.floor(i / itemGrid.cols) * itemGrid.pitchY}
              item={tabItems[i]}
            />
          ))}
        </ul>
      </div>

      {/* Greyed out: everything fits, so there's nothing to scroll */}
      <div
        aria-hidden
        data-testid="scrollbar"
        className="absolute flex flex-col"
        style={{ left: scrollbar.x, top: scrollbar.y, width: scrollbar.width, height: scrollbar.height }}
      >
        <Sprite src={inventoryAsset("scrollbar/disabled-prev.png")} />
        <div
          className="flex-1"
          style={{ backgroundImage: `url(${inventoryAsset("scrollbar/disabled-base.png")})` }}
        />
        <Sprite src={inventoryAsset("scrollbar/disabled-next.png")} />
      </div>

      <p
        className="absolute pr-1 text-right font-sans text-[11px] leading-4 text-black tabular-nums"
        style={{ left: mesosBox.x, top: mesosBox.y, width: mesosBox.width, height: mesosBox.height }}
      >
        {mesos.toLocaleString("en-US")}
        <span className="sr-only"> mesos</span>
      </p>
    </InventoryWindow>
  );
}
