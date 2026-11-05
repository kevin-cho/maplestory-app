# MapleStory Classic toolkit: base app, hosted on kevincho.ca

**Status:** In progress: Steps 1–5 done. The zone is live at `https://maplestory-app.vercel.app/maplestory`. Step 6 (portal integration) is in progress on the portal branch `maplestory-zone`. Each step still needs approval before it is built. Step 6 also gets a portal-side plan doc, `kevincho.ca/docs/plans/05-maplestory-zone.md`.

## Context
Kevin plays MapleStory Classic World and wants a web app that will later hold several tools (first planned: a damage calculator and a scroll simulator). This plan covers **only the base app**, plus hooking it into Kevin's portal. The tools come later, each with its own plan.

**Portal facts** (repo `~/Projects/kevin-cho.github.io`, GitHub `kevin-cho/kevincho.ca`):
- **Stack:** Next.js 16.4.3 with the App Router, React 19.3, Tailwind 4 and Node 24, deployed on Vercel (project `kevincho-portal`) at `kevincho.ca`.
- **How apps are hosted:** its README already sets the rule. Each app has its own repo and its own Vercel project. It's served under a path using **Next.js Multi-Zones**: the app sets `basePath`, and the portal adds rewrites for `/path` and `/path/*`. The rewrite isn't set up yet ("will be added with the first app"), so **this is the first zone**.
- **Listing apps:** the home page lists apps from `src/data/apps.ts` (empty today). The list uses plain `<a>` links, which is right for cross-zone links (hard navigation).
- **Theme:** colors are defined once in `src/app/globals.css` (`background`, `foreground`, `muted-foreground`, `muted`, `border`). `ThemeScript` reads and saves `localStorage["theme"]` and sets `.dark` on `<html>`, and `ThemeToggle` uses react-icons sun/moon icons. Fonts are Poppins and Geist Mono.
- **Testing:** Playwright e2e is the default check (`e2e/fixtures.ts` fails a test on console errors), with a GitHub Actions workflow that runs lint and e2e.
- **Ports in use:** dev 3000, next-start 3001, e2e 3100.

`/Users/kevincho/Projects/maplestory-app` is empty and not a git repo. There is no public Classic API, so the app is client-side only.

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.4.3 (App Router) + TS + Tailwind 4, the same versions as the portal.** This replaces the earlier Vite idea. | Multi-Zones is built for Next.js apps. Matching versions means the theme code, tests and Vercel setup can be copied as-is. |
| Hosting | **Its own Multi-Zone:** own repo, own Vercel project, `basePath: "/maplestory"`, and portal rewrites pointing at it | This is the approach the portal README already chose, and the app deploys independently of the portal |
| URL path | `kevincho.ca/maplestory`, with tools at `/maplestory/damage` and `/maplestory/scroll` | Clear, and doesn't clash with portal pages. Easy to change before Step 1. |
| Look and theme | Copy the portal's color tokens, fonts, `ThemeScript` and `ThemeToggle` | Under kevincho.ca both apps share `localStorage["theme"]`, so the theme choice carries across. A shared npm package isn't worth it for two apps. |
| Links | Inside the app, `next/link` (basePath is added automatically). Back to the portal, a plain `<a href="/">` with an arrow like the Mario page. | Cross-zone links must be hard navigations, per the Next.js multi-zones guide |
| Tool registry | `src/data/tools.ts` lists `{ slug, name, description }`, and the home grid and nav map over it | Adding a tool later means one entry plus one page folder |
| Portal → zone URL | Portal env var `MAPLESTORY_URL` (Vercel: the zone's production `*.vercel.app` URL; local: `http://localhost:3002` in `.env.local`). The rewrites are skipped when it's unset. | The portal can proxy to a local zone while developing, and builds don't break without the variable |
| Ports | Dev 3002, e2e 3102 | Avoids the portal's 3000, 3001 and 3100 |

## Steps (each needs approval before it is built)

### Step 1: Scaffold the zone ✅ Done (commit `a40502c`)
- **Requirement:**
  - A Next.js app in this folder, matching the portal's versions, with `.nvmrc` (24) and `basePath: "/maplestory"`.
  - `npm run dev` serves it at `localhost:3002/maplestory`.
  - Also set up: git init, a `.claude/launch.json` (`maple-dev`), and `docs/plans/01-base-app.md`.
- **Why:** A working baseline whose URL shape already matches production.
- **How:**
  - Run `nvm use 24`, then `npx create-next-app@16.4.3 .` (TS, App Router, `src/`, Tailwind, ESLint).
  - Set `basePath` in `next.config.ts` and `-p 3002` in the dev script.
  - Read `node_modules/next/dist/docs` for basePath (AGENTS.md warns this Next version differs).
  - Commit only when you ask.
- **Result (2026-11-04):**
  - **Scaffold:** `create-next-app@16.4.3` produced the same versions and `next.config.ts` as the portal. Next 16.4.3, React 19.3.0, Tailwind 4, `cacheComponents` and `partialPrefetching` are all on.
  - **Where it was generated:** in a temporary folder (this one already had `docs/`), then moved here. create-next-app's automatic commit was dropped, and `git init -b main` started a fresh repo with nothing committed.
  - **Config:** added `basePath: "/maplestory"`, `dev` on port 3002, `engines.node` 24.x, `.nvmrc` (24), and `.claude/launch.json` (`maple-dev`).
  - **Starter images:** the page's two images are prefixed with `/maplestory`, because `next/image` doesn't add the base path. That page gets replaced in Step 3.
  - **Checks:** `npm run lint`, `npm run build` (routes `/` and `/_not-found`, both static) and `tsc --noEmit` all pass. Run `tsc` after a build, because `LayoutProps` is generated into `.next/`.
  - **Browser check:** `localhost:3002/maplestory` renders the starter page, and every script, font and image under `/maplestory/...` returns 200. `localhost:3002/` returns 404, as expected: the app only serves under its base path.
  - **Dev server:** left running.

### Step 2: Portal look and theme ✅ Done (commit `58824c9`)
- **Requirement:** Same colors, fonts and light/dark behaviour as the portal, including a theme toggle that shares the portal's saved choice.
- **Why:** Hard navigation from kevincho.ca should feel like the same site.
- **How:**
  - Copy `globals.css` tokens, `theme-script.tsx`, `theme-toggle.tsx`, the font setup from `layout.tsx`, and the `react-icons` dependency.
  - Add a source comment noting each file is mirrored from the portal.
- **Result (2026-11-04):**
  - **Copied from the portal, each with a "mirrored from the portal, keep in sync" comment:**
    - `src/app/globals.css`, identical apart from that comment (checked with `diff`)
    - `src/components/theme-script.tsx`
    - `src/components/theme-toggle.tsx`
  - **Added:** `react-icons@^5.7.0`, the same range as the portal.
  - **Layout:** `src/app/layout.tsx` now matches the portal's: Poppins + Geist Mono, `ThemeScript` in `<head>`, and a header with the toggle on the right. The title is "MapleStory Classic Tools · Kevin Cho".
  - **Browser check:**
    - With nothing saved it followed the OS theme (dark).
    - Clicking the toggle switched to light and saved `localStorage["theme"] = "light"`, the same key the portal uses.
    - The choice survived a reload, and the body font is Poppins.
    - The test setting was cleared afterwards.
  - **Checks:** lint, `tsc --noEmit` and `npm run build` pass.
  - **Not yet:** the starter page content stays until Step 3.

### Step 3: App shell, tool registry, placeholder pages ✅ Done (commit `6a6be44`)
- **Requirement:**
  - **Header:** a back-to-portal arrow (`<a href="/">`), "MapleStory Classic Tools", and the theme toggle.
  - **Home page:** `/maplestory` shows a grid of tool cards from `src/data/tools.ts`.
  - **Placeholders:** "Coming soon" pages at `/maplestory/damage` and `/maplestory/scroll`.
  - **Not found:** the zone has its own not-found page.
- **Why:** The container the future tools plug into.
- **How:**
  - Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[tool]/page.tsx` with `generateStaticParams` from the registry, and `src/app/not-found.tsx`.
  - Cards use the same style as the portal's app list.
- **Changes from the plan:**
  - **Static folders instead of `[tool]`:** each tool has its own folder (`src/app/damage/`, `src/app/scroll/`). With `cacheComponents` on, `dynamicParams` isn't available (per the bundled Next docs), so a `[tool]` route would render unknown slugs at request time instead of returning 404. Each tool becomes a distinct page later anyway.
  - **No tool links in the header:** the arrow, title, links and toggle don't fit at 375px. The home page lists the tools, and the app name links back to it.
  - **Icons:** the portal's `icon.png` and `apple-icon.png` replace Next's starter favicon.
- **Result (2026-11-04):**
  - **Tool registry:** `src/data/tools.ts` holds `{ slug, name, description }` plus `getTool()`, which throws on a typo so the build fails.
  - **Header (`src/components/site-header.tsx`):**
    - The back arrow is a plain `<a href="/">` labelled "Back to kevincho.ca". Lint's `no-html-link-for-pages` rule is disabled for that one line, with a reason: it assumes `/` is a page in this app.
    - The app name is a `next/link` to the app home.
    - The theme toggle sits on the right.
  - **Home page:** `/maplestory` shows a heading and a card grid with the same style as the portal's app list.
  - **Tool pages:** `/maplestory/damage` and `/maplestory/scroll` render a shared `ComingSoon` component. Titles come from a layout template: "<Tool> · MapleStory Classic Tools".
  - **Not found:** `not-found.tsx` returns 404 with a link back to all tools.
  - **Cleanup:** the unused starter SVGs and the `public/` folder are removed.
- **Checks:**
  - Lint, `tsc --noEmit` and `npm run build` pass. All routes are static.
  - **Browser (dev):**
    - Cards link to `/maplestory/damage` and `/maplestory/scroll`, and the back arrow's href is `/`.
    - Clicking a card navigates client-side, and titles are correct.
    - `/maplestory/nope` returns 404 with the not-found page.
    - Light, dark, and 375px wide all look right, with no horizontal scroll.
  - **Production (`next start`):** navigating home → card → page shows no console messages.
- **Note:** in dev mode only, React logs "Encountered a script tag while rendering React component". It comes from `ThemeScript`, which is mirrored unchanged from the portal (so the portal's dev server likely logs it too). Production builds don't log it, and e2e tests run against production, so I left it as is to keep the two copies identical.

### Step 4: Tests and CI ✅ Done (commit `767de08`)
- **Requirement:**
  - Playwright e2e tests for the home grid, navigation to each placeholder, the theme toggle, the 404 page, and no horizontal scroll at 375px.
  - A GitHub Actions workflow running lint and e2e.
- **Why:** Same safety net as the portal, ready before real tools arrive.
- **How:**
  - Copy the portal's `playwright.config.ts` (port 3102, `baseURL` with `/maplestory`), `e2e/fixtures.ts` and `.github/workflows/e2e.yml`.
  - Add the `test:e2e` script and a CLAUDE.md section like the portal's.
- **Changes from the plan:**
  - **`baseURL` without the base path:** it's just the origin, and tests use full paths (`/maplestory/...`). With the base path in `baseURL`, a leading `/` in `page.goto()` would silently drop it.
  - **Readiness URL:** Playwright's `webServer.url` waits on `/maplestory`, because `/` is a 404.
  - **README:** rewritten too, replacing the create-next-app text with portal-style sections (how it fits together, adding a tool, development, tests, layout).
- **Result (2026-11-04):**
  - **Setup:** `@playwright/test@^1.64.1` (same as the portal), a `test:e2e` script, `playwright.config.ts` on port 3102, `e2e/fixtures.ts` copied unchanged, and the Playwright output folders added to `.gitignore`.
  - **`e2e/home.spec.ts`:**
    - the title and heading
    - one card per tool, each linking to `/maplestory/<slug>` with its description
    - the back arrow's href is `/`, and the app name returns to `/maplestory`
    - theme: follows the OS, the toggle persists across reloads, and it saves under `localStorage["theme"]`
    - no horizontal scroll at 375px on the home page and both tool pages
  - **`e2e/tools.spec.ts`:**
    - each tool opens from its card with the right URL, title and heading
    - each placeholder shows "Coming soon" and links back to all tools
    - an unknown path returns 404 with the not-found page
  - **The 404 test's console message:** Chromium logs the page's own 404 as a console error, so that test removes exactly one copy of that message. The shared fixture stays identical to the portal's.
  - **CI:** `.github/workflows/e2e.yml` is the portal's workflow without the submodule checkout, and runs on pushes to `main`.
  - **`CLAUDE.md`:** covers the zone-compatibility rules (basePath, `<a>` to the portal, mirrored files) and the portal's "Verifying changes" section.
  - **Checks:**
    - `npm run test:e2e`: 15 passed in about 14s.
    - lint and `tsc --noEmit` pass.
    - The `next dev` preview kept working during e2e builds, since Next 16 keeps dev output in `.next/dev`.
    - CI itself runs once the repo is on GitHub (Step 5).

### Step 5: Deploy the zone on its own ✅ Done
- **Requirement:** The repo is on GitHub (`kevin-cho/maplestory-app`) and has a Vercel project. `https://<project>.vercel.app/maplestory` works publicly.
- **Why:** The portal can only proxy to a deployed zone.
- **How:**
  - **Kevin:** creates the GitHub repo (or approves `gh repo create`) and imports it in Vercel. Vercel production URLs are public; previews need login.
  - **Claude:** pushes only with your OK, then checks the production URL in the browser pane.
- **Result (2026-11-04):**
  - **GitHub:** Kevin chose a public repo. `gh repo create kevin-cho/maplestory-app --public --source . --push` created it and pushed `main` (commits `a40502c` to `767de08`): https://github.com/kevin-cho/maplestory-app
  - **First CI run:** lint and 15 e2e tests passed in about 1.5 minutes ([run 41940559296](https://github.com/kevin-cho/maplestory-app/actions/runs/41940559296)).
  - **Vercel:** Kevin imported the repo as project `maplestory-app` (team `kevin-cho`) with default settings, and the Vercel status on `main` is success.
  - **Production domain:** `https://maplestory-app.vercel.app`, which is public.
    - `/maplestory` returns 200, and `/` returns 404 as expected.
    - The team domain `maplestory-app-kevin-cho.vercel.app` redirects to a Vercel login (deployment protection), so the portal must point at `maplestory-app.vercel.app`.
  - **Browser check:**
    - The home page title, heading and fonts are correct, and the cards link to `/maplestory/damage` and `/maplestory/scroll`.
    - Clicking a card opens the tool page client-side.
    - The back arrow's href is `/`.
    - The console has no errors, only "preloaded but not used" warnings for Poppins font weights. That comes from the same `next/font` setup as the portal, and warnings don't fail the e2e fixture.

### Step 6: Add it to the portal (in `kevincho.ca`, on a branch) 🚧 In progress
- **Requirement:** `kevincho.ca/maplestory` and every subpath serve the zone. The portal home lists "MapleStory Classic Tools". The theme carries across, and the back arrow returns home.
- **Why:** This is the goal: the app is hosted on the portal.
- **How:**
  - **Portal changes:**
    - `next.config.ts`: `rewrites()` (as `beforeFiles`; see the change log) for `/maplestory` and `/maplestory/:path+` → `${MAPLESTORY_URL}/maplestory…`, only when the env var is set.
    - Add an entry to `src/data/apps.ts`.
    - In the README, replace the "Not set up yet" line with the real setup.
    - Add an e2e test that the home page lists the app with an `<a href="/maplestory">`.
  - **Kevin:** sets `MAPLESTORY_URL` in the portal's Vercel project.
  - **Tracking:** the portal plan `05-maplestory-zone.md` records it.
- **Verify:**
  - **Locally:** portal on 3000 with `.env.local` pointing at the zone on 3002, so `localhost:3000/maplestory` shows the zone.
  - **On Vercel:** first the preview, then production `kevincho.ca/maplestory` after merging. Check the theme persists across both zones.

## Verification (every step)
- Lint, `tsc --noEmit` and `npm run build` pass. From Step 4 on, `npm run test:e2e` passes too.
- I check the UI in the browser pane: light, dark, and 375px wide.
- I leave the dev server running for you to preview.

## Change log
- **2026-11-04**: Researched data sources. There is no public Classic API: Nexon's Open API covers modern KMS/MSEA/TMS only. Kevin picked the damage calculator and scroll simulator as the first tools, then narrowed this plan to the base app only.
- **2026-11-04**: Kevin asked for the app to be hosted on the kevincho.ca portal. Switched from Vite to Next.js 16.4.3 as a Multi-Zone, following the portal README. Added Steps 5 and 6 (deploy, portal integration). Plan approved.
- **2026-11-04**: Step 1 done: the Next.js zone is scaffolded with `basePath: "/maplestory"` on port 3002. Lint, build and types pass, and it was checked in the browser.
- **2026-11-04**: Step 1 committed (`a40502c`). Step 2 done: the portal's theme tokens, theme script, toggle and fonts were copied, and the toggle was checked in the browser.
- **2026-11-04**: Step 2 committed (`58824c9`). Step 3 done: the app shell, tool registry, placeholder tool pages and not-found page. It uses static per-tool folders instead of a `[tool]` route (`dynamicParams` isn't available with `cacheComponents`), and the header has no tool links (too crowded on phones).
- **2026-11-04**: Step 3 committed (`6a6be44`). Step 4 done: Playwright e2e tests (15 passing), a CI workflow, `CLAUDE.md` and a README rewrite. Test URLs use full `/maplestory` paths rather than putting the base path in `baseURL`.
- **2026-11-04**: Step 4 committed (`767de08`). Step 5 done: the public GitHub repo `kevin-cho/maplestory-app` was created and `main` pushed, and the first CI run passed. Kevin imported it into Vercel, and production `https://maplestory-app.vercel.app/maplestory` was checked in the browser.
- **2026-11-04**: Step 5's doc update committed (`4d4771f`). Step 6 started in the portal on branch `maplestory-zone`, tracked in its `docs/plans/05-maplestory-zone.md`. Rewrites, the app entry and the README are built and verified locally (portal on 3000 proxying to this zone on 3002, with the theme carrying across), and portal lint and e2e pass. Next: set `MAPLESTORY_URL` in Vercel, then the preview and production checks.
- **2026-11-04**: Portal branch `maplestory-zone` pushed (`29c8103`). On the Vercel preview, this zone's segment prefetches returned 404 through the portal, because the portal's routing mapped them before forwarding and this zone mapped them again. Kevin chose to fix it in the portal by making the rewrites `beforeFiles` (`a5f2d8a`). On the preview, all prefetches now return 200. Details in the portal's Plan 05. Next: PR, merge, production check.
