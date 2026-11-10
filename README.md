# MapleStory Classic Tools

Calculators and simulators for MapleStory Classic World, served at [kevincho.ca/maplestory](https://kevincho.ca/maplestory).

Built with [Next.js](https://nextjs.org) (App Router), React, TypeScript, and Tailwind CSS, deployed on [Vercel](https://vercel.com).

## How it fits together

- **This app is a zone of the kevincho.ca portal** ([`kevin-cho/kevincho.ca`](https://github.com/kevin-cho/kevincho.ca)), using [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones). It has its own repo and Vercel project and deploys independently. The portal rewrites `/maplestory` and `/maplestory/*` to it.
- **Everything is served under `basePath: "/maplestory"`** (see `next.config.ts`), including in development.
- **The look and theme match the portal's.** The color tokens, theme script and toggle are copies of the portal's files. On kevincho.ca both apps share the saved light/dark choice.
- **There's no backend.** There's no public API for MapleStory Classic, so the tools run in the browser on built-in game data and what you enter.

## Adding a tool

1. Add an entry to [`src/data/tools.ts`](src/data/tools.ts): `{ slug, name, description }`.
2. Add a page at `src/app/<slug>/page.tsx` (see `src/app/damage/page.tsx`).
3. Add or update its tests in `e2e/`.

The home page lists the tools in the order of `tools.ts`.

## Development

Requires Node 24 (see `.nvmrc`; with nvm, run `nvm use`).

```bash
npm install
npm run dev     # http://localhost:3002/maplestory
npm run build   # production build
npm run lint
```

`localhost:3002/` is a 404: the app only serves under `/maplestory`.

## Tests

End-to-end tests use [Playwright](https://playwright.dev) and live in `e2e/`. They run in headless Chromium against a fresh production build, which Playwright builds and starts on port 3102.

```bash
npx playwright install chromium   # once, downloads the test browser
npm run test:e2e                  # build, start, run the tests
npx playwright test --ui          # step through tests in Playwright's UI
```

Every test also fails if the page logs an error (see `e2e/fixtures.ts`). GitHub Actions runs lint and these tests on every pull request and push to `main`.

## Game assets

Game images, sounds and item data come from [maplestory.io](https://maplestory.io), which serves MapleStory's game files as JSON. The results are committed, so the scripts in `scripts/` only need running to refresh or change the assets. Both use only Node's built-in modules.

```bash
node scripts/fetch-cursors.mjs        # mouse cursor frames
node scripts/fetch-scroll-assets.mjs  # scroll icons, data, effects and sounds
node scripts/fetch-inventory-ui.mjs   # inventory windows, tabs and sample items
```

- **`fetch-cursors.mjs`** saves the in-game mouse cursor (GMS v270) to `public/cursors/`. It prints each frame's hotspot (the pixel that clicks). If those change, update `src/app/cursor.css` to match.
  - `cursor.css` applies the cursor automatically: the pointing finger everywhere, the finger and mouse on links and buttons, and the pressing finger while the mouse is down.
  - **Draggable items** (e.g. inventory slots): add the `cursor-grab` class to show the game's grab animation.
  - **While an item is held:** add `cursor-grabbing` to `<html>` (`document.documentElement.classList`) to show the closed hand everywhere. Remove it when the item is dropped.
- **`fetch-scroll-assets.mjs`** saves the assets for the scroll simulator (GMS v83). It takes a few seconds.
  - Every equipment scroll's data goes to `src/data/scrolls.json`.
  - Their icons go to `public/scrolls/icons/`. Many scrolls share an icon, so each distinct icon is saved once under a name from `ICON_NAMES` in the script. If it stops with "New icon…", add a name there.
  - The success and failure animations go to `public/scrolls/effects/`, described in `src/data/scroll-effects.json`.
  - Their sounds go to `public/scrolls/sounds/`.
- **`fetch-inventory-ui.mjs`** saves the Equipment and Item inventory windows (GMS v83) to `public/inventory/`.
  - The window art (`equip-window.png`, `item-window.png`) has the slots drawn in, but no slot positions in the data, so those are measured by hand in the app's layout code.
  - `tabs/` has the Item window's tab labels (white text) and the `frame-*` pieces the tab row is built from. The art's tab strip is blank, and the game draws the tabs in code.
  - `scrollbar/` has the Item window's greyed-out scrollbar pieces, also drawn in code. The app never has enough items to scroll, so the scrollbar always shows greyed out.
  - A few sample equips go to `public/inventory/items/{id}.png`, with their data in `src/data/sample-items.json`. To change them, edit `SAMPLE_ITEMS` in the script.
- **`scripts/lib/`** has the shared helpers: PNG read/write, and fetching with retries and a concurrency limit.

Animation frames are padded onto a shared canvas, so they stay aligned while animating. Browsers cache images, so hard-reload (Cmd+Shift+R) after refreshing them.

## Project layout

- `src/app/` — pages, root layout, global styles (`globals.css` defines the light/dark color roles, `cursor.css` the MapleStory cursor)
- `src/components/` — UI pieces (header, theme toggle, cursor press state, placeholder page)
- `src/data/tools.ts` — the tools listed on the home page
- `src/data/*.json` — game data from the asset scripts (`scrolls.json`, `scroll-effects.json`, `sample-items.json`)
- `public/cursors/`, `public/scrolls/`, `public/inventory/` — game images and sounds (see [Game assets](#game-assets))
- `scripts/` — scripts that download the game assets
- `e2e/` — Playwright end-to-end tests
- `docs/plans/` — step-by-step plans and their change logs
