import type { Page } from "@playwright/test";
import { tools } from "@/data/tools";
import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/maplestory");
});

test("shows the app's title and heading", async ({ page }) => {
  await expect(page).toHaveTitle("MapleStory Classic Tools · Kevin Cho");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "MapleStory Classic Tools",
  );
});

test("lists every tool, linking under /maplestory", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Tools" });
  await expect(nav.getByRole("link")).toHaveCount(tools.length);
  for (const tool of tools) {
    const card = nav.getByRole("link", { name: tool.name });
    await expect(card).toHaveAttribute("href", `/maplestory/${tool.slug}`);
    await expect(card).toContainText(tool.description);
  }
});

test.describe("header", () => {
  test("the back arrow goes to the portal, outside this app", async ({ page }) => {
    // The portal isn't running in these tests, so only the link is checked.
    // It must be "/" (no basePath) to leave this zone.
    await expect(
      page.getByRole("link", { name: "Back to kevincho.ca" }),
    ).toHaveAttribute("href", "/");
  });

  test("the app name links to this app's home", async ({ page }) => {
    await page.goto("/maplestory/damage");
    await page.getByRole("link", { name: "MapleStory Classic Tools" }).click();
    await expect(page).toHaveURL("/maplestory");
  });
});

// Same checks as the portal's theme tests, since the theme code is mirrored
test.describe("theme", () => {
  const html = (page: Page) => page.locator("html");

  test("follows the OS setting when nothing is saved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
  });

  test("toggle switches modes and the choice survives a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();

    await page.getByRole("button", { name: "Use dark mode" }).click();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Use light mode" }).click();
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
  });

  test("saves the choice under the portal's key", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await page.getByRole("button", { name: "Use dark mode" }).click();

    // On kevincho.ca both zones share this key, so the choice carries over
    const saved = await page.evaluate(() => localStorage.getItem("theme"));
    expect(saved).toBe("dark");
  });
});

test.describe("on a phone-sized screen", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const paths = ["/maplestory", ...tools.map((t) => `/maplestory/${t.slug}`)];
  for (const path of paths) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
});
