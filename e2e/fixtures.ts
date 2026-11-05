import { expect, test as base } from "@playwright/test";

/**
 * Playwright's `test`, plus a check that the page logged no errors. Every spec
 * imports `test` and `expect` from here, so each test also fails on uncaught
 * exceptions and console.error messages.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      await use(errors);
      expect(errors, "page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
