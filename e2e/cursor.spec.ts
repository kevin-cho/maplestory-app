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
  for (const name of ["default", "hover-1", "hover-2", "pressed"]) {
    const res = await request.get(`/maplestory/cursors/${name}.png`);
    expect(res.status(), name).toBe(200);
    expect(res.headers()["content-type"], name).toBe("image/png");
  }
});

test("both hover frames share one canvas, so the mouse icon doesn't shift", async ({
  request,
}) => {
  // Width and height sit at bytes 16–23 of a PNG (in its IHDR chunk)
  const sizeOf = async (name: string) => {
    const png = await (await request.get(`/maplestory/cursors/${name}.png`)).body();
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  expect(await sizeOf("hover-1")).toEqual(await sizeOf("hover-2"));
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
