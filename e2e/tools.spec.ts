import { tools } from "@/data/tools";
import { expect, test } from "./fixtures";

for (const tool of tools) {
  test.describe(tool.name, () => {
    test("opens from its card on the home page", async ({ page }) => {
      await page.goto("/maplestory");
      await page
        .getByRole("navigation", { name: "Tools" })
        .getByRole("link", { name: tool.name })
        .click();
      await expect(page).toHaveURL(`/maplestory/${tool.slug}`);
      await expect(page).toHaveTitle(`${tool.name} · MapleStory Classic Tools`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(tool.name);
    });

    // Update this test when the tool is built
    test("shows a placeholder that links back to all tools", async ({ page }) => {
      await page.goto(`/maplestory/${tool.slug}`);
      await expect(page.getByText("Coming soon")).toBeVisible();

      await page.getByRole("link", { name: "All tools" }).click();
      await expect(page).toHaveURL("/maplestory");
    });
  });
}

test("an unknown path shows the not-found page with a 404", async ({ page, pageErrors }) => {
  const response = await page.goto("/maplestory/no-such-tool");
  expect(response?.status()).toBe(404);

  // Chromium logs the page's own 404 as a console error. That one is expected,
  // so remove exactly one copy; a second copy (e.g. a missing script) still
  // fails the test through the fixture.
  const notFoundMessage =
    "Failed to load resource: the server responded with a status of 404 (Not Found)";
  const index = pageErrors.indexOf(notFoundMessage);
  expect(index, "the 404 console message").toBeGreaterThanOrEqual(0);
  pageErrors.splice(index, 1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");

  await page.getByRole("link", { name: "All tools" }).click();
  await expect(page).toHaveURL("/maplestory");
});
