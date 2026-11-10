import { checkTabsFit, wearItems } from "@/data/inventory-layout";
import { expect, test } from "./fixtures";

// The inventory layout's rules, tested directly (no page needed): where worn
// items go, and that items can't quietly go missing

const item = (name: string, ...islots: string[]) => ({ name, islots });

test.describe("wearItems", () => {
  test("puts each item in the slot its first code names", () => {
    const hat = item("Zakum Helmet", "Cp");
    const sword = item("Sword", "Wp");
    expect(wearItems([hat, sword])).toEqual({ cap: hat, weapon: sword });
  });

  test("rings fill the four ring slots in order", () => {
    const rings = [1, 2, 3, 4].map((n) => item(`Ring ${n}`, "Ri"));
    expect(wearItems(rings)).toEqual({
      "ring-1": rings[0],
      "ring-2": rings[1],
      "ring-3": rings[2],
      "ring-4": rings[3],
    });
    expect(() => wearItems([...rings, item("Ring 5", "Ri")])).toThrow(
      "Can't wear Ring 5: Ring is taken by Ring 1",
    );
  });

  test("medals, belts and mounts have slots", () => {
    expect(Object.keys(wearItems([item("Medal", "Me"), item("Belt", "Be"), item("Hog", "Tm"), item("Saddle", "Sd")]))).toEqual(
      ["medal", "belt", "taming-mob", "saddle"],
    );
  });

  test("two items for one slot throw instead of one disappearing", () => {
    expect(() => wearItems([item("Sword", "Wp"), item("Maple Sword", "Wp")])).toThrow(
      "Can't wear Maple Sword: Weapon is taken by Sword",
    );
  });

  test("an item's other codes block those slots", () => {
    // A bow takes the shield slot too, and an overall the pants slot
    const bow = item("Maple Soul Searcher", "Wp", "Si");
    expect(wearItems([bow])).toEqual({ weapon: bow });
    expect(() => wearItems([bow, item("Maple Shield", "Si")])).toThrow(
      "Can't wear Maple Shield: Shield is taken by Maple Soul Searcher",
    );
    expect(() => wearItems([item("Maple Shield", "Si"), bow])).toThrow(
      "Can't wear Maple Soul Searcher: it needs the Shield slot, taken by Maple Shield",
    );
    expect(() => wearItems([item("Blue Jean Shorts", "Pn"), item("Chainmail", "Ma", "Pn")])).toThrow(
      "it needs the Pants slot",
    );
  });

  test("an item with no slot throws", () => {
    // Pet equipment has no islots in the game data
    expect(() => wearItems([item("Red Ribbon")])).toThrow("No equip slot for Red Ribbon");
  });
});

test("checkTabsFit throws for more than 24 items in a tab", () => {
  expect(() => checkTabsFit({ use: Array(24).fill(0) })).not.toThrow();
  expect(() => checkTabsFit({ use: Array(25).fill(0) })).toThrow("The use tab has 25 items, but only 24 fit");
});
