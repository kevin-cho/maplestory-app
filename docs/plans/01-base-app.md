# MapleStory Classic toolkit: base app, hosted on kevincho.ca

**Status:** In progress: Steps 1 and 2 done (Step 2 not committed yet). Each step still needs approval before it is built. Step 6 also gets a portal-side plan doc, `kevincho.ca/docs/plans/05-maplestory-zone.md`.

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

### Step 2: Portal look and theme ✅ Done (not committed yet)
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

### Step 3: App shell, tool registry, placeholder pages ⏳ Not started
- **Requirement:**
  - **Header:** a back-to-portal arrow (`<a href="/">`), "MapleStory Classic Tools", and the theme toggle.
  - **Home page:** `/maplestory` shows a grid of tool cards from `src/data/tools.ts`.
  - **Placeholders:** "Coming soon" pages at `/maplestory/damage` and `/maplestory/scroll`.
  - **Not found:** the zone has its own not-found page.
- **Why:** The container the future tools plug into.
- **How:**
  - Files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[tool]/page.tsx` with `generateStaticParams` from the registry, and `src/app/not-found.tsx`.
  - Cards use the same style as the portal's app list.

### Step 4: Tests and CI ⏳ Not started
- **Requirement:**
  - Playwright e2e tests for the home grid, navigation to each placeholder, the theme toggle, the 404 page, and no horizontal scroll at 375px.
  - A GitHub Actions workflow running lint and e2e.
- **Why:** Same safety net as the portal, ready before real tools arrive.
- **How:**
  - Copy the portal's `playwright.config.ts` (port 3102, `baseURL` with `/maplestory`), `e2e/fixtures.ts` and `.github/workflows/e2e.yml`.
  - Add the `test:e2e` script and a CLAUDE.md section like the portal's.

### Step 5: Deploy the zone on its own ⏳ Not started
- **Requirement:** The repo is on GitHub (`kevin-cho/maplestory-app`) and has a Vercel project. `https://<project>.vercel.app/maplestory` works publicly.
- **Why:** The portal can only proxy to a deployed zone.
- **How:**
  - **Kevin:** creates the GitHub repo (or approves `gh repo create`) and imports it in Vercel. Vercel production URLs are public; previews need login.
  - **Claude:** pushes only with your OK, then checks the production URL in the browser pane.

### Step 6: Add it to the portal (in `kevincho.ca`, on a branch) ⏳ Not started
- **Requirement:** `kevincho.ca/maplestory` and every subpath serve the zone. The portal home lists "MapleStory Classic Tools". The theme carries across, and the back arrow returns home.
- **Why:** This is the goal: the app is hosted on the portal.
- **How:**
  - **Portal changes:**
    - `next.config.ts`: `rewrites()` for `/maplestory` and `/maplestory/:path+` → `${MAPLESTORY_URL}/maplestory…`, only when the env var is set.
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
