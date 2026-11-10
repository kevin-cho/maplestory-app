import { equipSlots } from "@/data/inventory-layout";
import { expect, test } from "./fixtures";

// The inventory windows on the Scroll Simulator page (Plan 05), with their
// sample contents

test.beforeEach(async ({ page }) => {
  await page.goto("/maplestory/scroll");
});

const equipWindow = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Equipment Inventory" });
const itemWindow = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Item Inventory" });

test("every image loads, including CSS backgrounds", async ({ page, request }) => {
  // Wait for the network to settle, then check no <img> is broken
  await page.waitForLoadState("networkidle");
  const broken = await page.locator("img").evaluateAll((imgs) =>
    (imgs as HTMLImageElement[])
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src),
  );
  expect(broken).toEqual([]);

  // The tab fills and the scrollbar track are CSS backgrounds, which a broken
  // <img> check can't see (and a 404 there logs no console error). Check both
  // tab states: the open tab uses fill1, the others fill0.
  const backgrounds = new Set<string>();
  for (const tab of ["Equip", "Use"]) {
    await itemWindow(page).getByRole("tab", { name: tab }).click();
    const urls = await page.locator("section *").evaluateAll((els) =>
      els.flatMap((el) => {
        const match = getComputedStyle(el).backgroundImage.match(/url\("?(.+?)"?\)/);
        return match ? [match[1]] : [];
      }),
    );
    urls.forEach((url) => backgrounds.add(url));
  }
  expect([...backgrounds].some((url) => url.includes("frame-fill1"))).toBe(true);
  expect([...backgrounds].some((url) => url.includes("scrollbar/disabled-base"))).toBe(true);
  for (const url of backgrounds) {
    expect((await request.get(url)).status(), url).toBe(200);
  }
});

test("the equip window has every slot, with the worn items in theirs", async ({ page }) => {
  const slots = equipWindow(page).getByRole("list", { name: "Equipped items" }).getByRole("listitem");
  await expect(slots).toHaveCount(equipSlots.length);

  for (const [slot, item] of [
    ["cap", "Zakum Helmet"],
    ["weapon", "Sword"],
    ["shield", "Maple Shield"],
    ["shoes", "Red Rubber Boots"],
    ["mantle", "Green Napoleon"],
  ]) {
    await expect(page.locator(`[data-slot="${slot}"]`).getByRole("img")).toHaveAccessibleName(item);
  }
  await expect(equipWindow(page).getByRole("listitem", { name: "Belt" }).getByRole("img")).toHaveCount(0);
});

test("the item window starts on the Equip tab, with 24 slots", async ({ page }) => {
  const window = itemWindow(page);
  await expect(window.getByRole("tab", { name: "Equip" })).toHaveAttribute("aria-selected", "true");
  const panel = window.getByRole("tabpanel", { name: "Equip" });
  await expect(panel.getByRole("listitem")).toHaveCount(24);
  await expect(panel.getByRole("listitem", { name: "Slot 1" }).getByRole("img")).toHaveAccessibleName("Maple Sword");
  await expect(panel.getByRole("img")).toHaveCount(5);
});

test("tabs switch by click and with the arrow keys", async ({ page }) => {
  const window = itemWindow(page);
  const use = window.getByRole("tab", { name: "Use" });
  await use.click();
  await expect(use).toHaveAttribute("aria-selected", "true");
  await expect(window.getByRole("tab", { name: "Equip" })).toHaveAttribute("aria-selected", "false");
  // The open tab's label is the same image, raised 1 px (2 CSS px at 2×)
  const labelTop = async (name: string) =>
    (await window.getByRole("tab", { name }).getByRole("img").boundingBox())?.y ?? NaN;
  expect((await labelTop("Equip")) - (await labelTop("Use"))).toBe(2);

  const panel = window.getByRole("tabpanel", { name: "Use" });
  await expect(panel.getByRole("img")).toHaveCount(5);
  await expect(panel.getByRole("listitem", { name: "Slot 4" }).getByRole("img")).toHaveAccessibleName(
    "Chaos Scroll 60%",
  );

  await page.keyboard.press("ArrowRight");
  const setup = window.getByRole("tab", { name: "Set-up" });
  await expect(setup).toHaveAttribute("aria-selected", "true");
  await expect(setup).toBeFocused();
  await expect(window.getByRole("tabpanel", { name: "Set-up" }).getByRole("img")).toHaveCount(0);

  await page.keyboard.press("ArrowLeft");
  await expect(use).toBeFocused();
  await expect(use).toHaveAttribute("aria-selected", "true");
});

test("the scrollbar shows greyed out, since everything fits", async ({ page }) => {
  const imgs = itemWindow(page).getByTestId("scrollbar").locator("img");
  await expect(imgs).toHaveCount(2);
  for (const src of await imgs.evaluateAll((els) => els.map((e) => e.getAttribute("src")))) {
    expect(src).toMatch(/\/scrollbar\/disabled-/);
  }
});

test("shows the mesos", async ({ page }) => {
  await expect(itemWindow(page).getByText("1,234,567")).toBeVisible();
});

test.describe("size", () => {
  test("2× on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    const box = await itemWindow(page).boundingBox();
    expect(box?.width).toBe(350);
  });

  test("1× on a phone, with no sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const box = await itemWindow(page).boundingBox();
    expect(box?.width).toBe(175);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
