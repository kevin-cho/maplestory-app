import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

// Playwright can't see the OS cursor itself, so these check the computed
// `cursor` style (which includes the running animation's current frame).

const cursorOf = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).cursor);
const animationOf = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).animationName);

test.beforeEach(async ({ page }) => {
  await page.goto("/maplestory");
});

test("serves every cursor image under the basePath", async ({ request }) => {
  for (const name of [
    "default",
    "hover-1",
    "hover-2",
    "pressed",
    "grab-open",
    "grab-half",
    "grab-close",
  ]) {
    const res = await request.get(`/maplestory/cursors/${name}.png`);
    expect(res.status(), name).toBe(200);
    expect(res.headers()["content-type"], name).toBe("image/png");
  }
});

test("animation frames share one canvas, so they don't shift", async ({ request }) => {
  // Width and height sit at bytes 16–23 of a PNG (in its IHDR chunk)
  const sizeOf = async (name: string) => {
    const png = await (await request.get(`/maplestory/cursors/${name}.png`)).body();
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  // The mouse icon stays still while the finger wags
  expect(await sizeOf("hover-1")).toEqual(await sizeOf("hover-2"));
  // The hand closes in place, and the holding cursor is the closed frame
  const grab = await sizeOf("grab-open");
  expect(await sizeOf("grab-half")).toEqual(grab);
  expect(await sizeOf("grab-close")).toEqual(grab);
});

test("the page uses the pointing finger", async ({ page }) => {
  expect(await cursorOf(page.locator("body"))).toContain(
    "/maplestory/cursors/default.png",
  );
});

test("the cursor is marked 2x, so Retina screens draw it at game size", async ({ page }) => {
  // Without the 2x entry, high-density screens double the cursor and blur it
  const cursor = await cursorOf(page.locator("body"));
  expect(cursor).toContain("image-set(");
  // Chrome reports "2x" as "2dppx" (the same unit)
  expect(cursor).toMatch(/default\.png"\) 2(x|dppx)/);
});

test("links and buttons animate the finger-and-mouse cursor", async ({ page }) => {
  const clickables = [
    page.getByRole("link", { name: "MapleStory Classic Tools" }),
    page.getByRole("button", { name: "Use dark mode" }),
  ];
  for (const el of clickables) {
    expect(await animationOf(el)).toBe("maple-cursor-hover");
    expect(await cursorOf(el)).toMatch(/\/maplestory\/cursors\/hover-[12]\.png/);
  }
});

test("text fields use the pointing finger, not the I-beam", async ({ page }) => {
  // The tools have no inputs yet, so add some to check the rules
  await page.evaluate(() => {
    const checkbox = Object.assign(document.createElement("input"), { type: "checkbox" });
    document.body.append(
      document.createElement("input"),
      document.createElement("textarea"),
      checkbox,
    );
  });
  for (const field of ["body > input:not([type])", "body > textarea"]) {
    expect(await cursorOf(page.locator(field)), field).toContain(
      "/maplestory/cursors/default.png",
    );
  }
  // Clickable inputs still get the hover cursor
  expect(await animationOf(page.locator("body > input[type=checkbox]"))).toBe(
    "maple-cursor-hover",
  );
});

test("holding the mouse down shows the pressing finger", async ({ page }) => {
  const html = page.locator("html");
  const link = page.getByRole("link", { name: "MapleStory Classic Tools" });

  // Press on an empty spot so nothing navigates
  await page.mouse.move(5, 300);
  await page.mouse.down();
  await expect(html).toHaveAttribute("data-mouse-down", "");
  expect(await cursorOf(page.locator("body"))).toContain("/maplestory/cursors/pressed.png");
  // It also wins over the hover animation
  expect(await cursorOf(link)).toContain("/maplestory/cursors/pressed.png");

  await page.mouse.up();
  await expect(html).not.toHaveAttribute("data-mouse-down");
  expect(await cursorOf(page.locator("body"))).toContain("/maplestory/cursors/default.png");
});

test("with reduced motion, hovering shows one still frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const link = page.getByRole("link", { name: "MapleStory Classic Tools" });
  expect(await animationOf(link)).toBe("none");
  expect(await cursorOf(link)).toContain("/maplestory/cursors/hover-1.png");

  // Checkboxes too, despite the plain `input` rule
  await page.evaluate(() =>
    document.body.append(Object.assign(document.createElement("input"), { type: "checkbox" })),
  );
  expect(await cursorOf(page.locator("body > input[type=checkbox]"))).toContain(
    "/maplestory/cursors/hover-1.png",
  );
});

// Draggable items (Plan 04). The app has no inventory yet, so these add
// stand-in elements with the classes the inventory will use.
test.describe("grab and holding", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      // Text gives them a size, so the mouse can hover them
      const item = Object.assign(document.createElement("div"), { id: "item", textContent: "Item" });
      const button = Object.assign(document.createElement("button"), {
        id: "item-button",
        textContent: "Item button",
      });
      item.className = button.className = "cursor-grab";
      document.body.append(item, button);
    });
  });

  test("draggable items animate the grab cursor, even on buttons", async ({ page }) => {
    for (const id of ["#item", "#item-button"]) {
      const el = page.locator(id);
      expect(await animationOf(el), id).toBe("maple-cursor-grab");
      expect(await cursorOf(el), id).toMatch(/\/maplestory\/cursors\/grab-(open|half|close)\.png/);
    }
  });

  test("holding an item shows the closed hand everywhere", async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add("cursor-grabbing"));
    const link = page.getByRole("link", { name: "MapleStory Classic Tools" });
    for (const el of [page.locator("body"), page.locator("#item"), link]) {
      expect(await cursorOf(el)).toContain("/maplestory/cursors/grab-close.png");
    }
  });

  test("pressing on an item shows the closed hand, not the pressing finger", async ({
    page,
  }) => {
    // No flash of the finger between hovering and picking the item up
    await page.locator("#item").hover();
    await page.mouse.down();
    await expect(page.locator("html")).toHaveAttribute("data-mouse-down", "");
    expect(await cursorOf(page.locator("#item"))).toContain("/maplestory/cursors/grab-close.png");
    // Pressing elsewhere still shows the pressing finger
    expect(await cursorOf(page.locator("body"))).toContain("/maplestory/cursors/pressed.png");
    await page.mouse.up();
  });

  test("holding beats pressing", async ({ page }) => {
    await page.evaluate(() => document.documentElement.classList.add("cursor-grabbing"));
    await page.mouse.move(5, 300);
    await page.mouse.down();
    await expect(page.locator("html")).toHaveAttribute("data-mouse-down", "");
    expect(await cursorOf(page.locator("body"))).toContain("/maplestory/cursors/grab-close.png");
    await page.mouse.up();
  });

  test("with reduced motion, grab shows the open hand", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const id of ["#item", "#item-button"]) {
      const el = page.locator(id);
      expect(await animationOf(el), id).toBe("none");
      expect(await cursorOf(el), id).toContain("/maplestory/cursors/grab-open.png");
    }
  });
});
