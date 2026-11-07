# MapleStory mouse cursor

**Status:** 🚧 In progress on branch `maple-cursor`. Step 1 is done (not committed yet). Next: Step 2, waiting for approval.

## Context
Kevin wants the app's mouse cursor to match the in-game MapleStory one, with three states:
1. **Default:** a static pointing finger.
2. **Hovering something clickable:** the finger plus a small mouse icon, animated over 2 frames. In the second frame the left mouse button is red.
3. **Mouse down:** the finger pressing, with no mouse icon.

**Research findings (verified 2026-11-07):**
- maplestory.io exposes the game's WZ data at `https://maplestory.io/api/wz/{region}/{version}/{path}`. Note that `/api/{region}/{version}/wz/...` returns 404.
- The cursors are under `UI/Basic.img/Cursor`.
- Each frame returns JSON with the PNG as base64 in `value`. It also has an `origin` child (the hotspot, where the click lands) and, for animated states, a `delay`.

The GMS v270 frames below were decoded and checked by eye. All of them match Kevin's description.

| State | WZ path | Size | Hotspot (origin) | Delay |
|---|---|---|---|---|
| Default | `Cursor/0/0` | 24×28 | 0, 3 | – |
| Hover, frame A | `Cursor/1/0` | 29×30 | 3, 6 | 500 ms |
| Hover, frame B (red button) | `Cursor/1/1` | 30×28 | 4, 4 | 500 ms |
| Pressed | `Cursor/12/0` | 25×23 | 4, 1 | – |

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Image source | Download the 4 frames once with a script and commit them to `public/cursors/` (~2 KB) | No runtime dependency on maplestory.io, Vercel caches them, and the script is kept so they're easy to re-fetch |
| Rendering | Native CSS `cursor: url(...) x y, auto` | No pointer lag. Hover animates with a CSS keyframe that swaps the two frames. The press state uses a tiny listener. |
| Scope | This app only, in a new `src/app/cursor.css` (not `globals.css`) | `globals.css` must stay identical to the portal's copy, and the portal keeps the normal cursor |
| Hotspots | Use each frame's WZ `origin` | The click point matches the fingertip exactly as in game. The hover frames' hotspots differ by 1–2 px, which is also how the game does it. |
| Reduced motion | Under `prefers-reduced-motion: reduce`, show hover frame A only (no animation) | Accessibility |
| Text fields | Keep the I-beam (`cursor: text`) in inputs and textareas | Normal text editing stays usable |
| Retina | 1× images only for now | A crisp @2× version would need an image library for nearest-neighbour upscaling. Revisit if it looks blurry. |

## Steps (each needs approval before it is built)

### Step 1: Download and commit the cursor images ✅ Done
- **Requirement:** `public/cursors/{default,hover-1,hover-2,pressed}.png` in the repo, plus a script that can regenerate them. Also create `docs/plans/02-maple-cursor.md` from this plan.
- **Why:** The images live with the app, so nothing depends on maplestory.io at runtime.
- **How:**
  - First create a branch from up-to-date `main`: `git switch -c maple-cursor`. All of this plan's commits go there, not on `main`.
  - Add `scripts/fetch-cursors.mjs` (Node 24 has `fetch` built in, so no new dependencies). It:
    - fetches the 4 frame URLs **in parallel with a 10 s timeout each**,
    - base64-decodes `value` into the PNG files,
    - prints each frame's `origin` so the CSS hotspots can be checked.
  - Run it once (it takes a few seconds, since there are only 8 requests) and view the PNGs to confirm.
- **Result:**
  - The script ran in 0.3 s. The hotspots it printed match the table above.
  - The 4 PNGs are byte-identical to the frames checked by eye during planning.
  - `eslint scripts/` is clean.

### Step 2: Apply the cursor with CSS, plus a press listener ⏳ Waiting for approval
- **Requirement:** All three states work across the app.
- **Why:** This is the feature itself.
- **How:**
  - **New `src/app/cursor.css`**, imported in `src/app/layout.tsx` after `globals.css`. URLs are written out with the basePath (`/maplestory/cursors/...`), because CSS `url()` doesn't get it added automatically.
  - **Default:** `html { cursor: url(/maplestory/cursors/default.png) 0 3, auto; }`
  - **Clickable** (`a[href]`, `button:not(:disabled)`, `[role="button"]`, `summary`, `label[for]`, `select`, and checkbox/radio/submit inputs): a `@keyframes maple-cursor-hover` animation over 1 s with `steps`/`step-end`. It shows frame A (hotspot 3 6) for the first half and frame B (hotspot 4 4) for the second.
  - **Text inputs and textareas:** `cursor: text`.
  - **Pressed:** `html[data-mouse-down], html[data-mouse-down] * { cursor: url(.../pressed.png) 4 1, auto !important; }`
    - `!important` is needed because an `!important` declaration beats a running CSS animation.
    - It applies to the whole page, so the pressed finger shows wherever you press, as in game.
  - **New `src/components/cursor-press.tsx`**, a client component rendered once in the layout:
    - on `pointerdown` (left button, mouse only), it sets `data-mouse-down` on `<html>`,
    - on `pointerup`, `pointercancel` and window `blur`, it removes it.
  - **Reduced motion:** a `@media (prefers-reduced-motion: reduce)` rule that drops the animation and keeps frame A.
  - **New `e2e/cursor.spec.ts`**, which checks:
    - the 4 image URLs return 200,
    - `<body>`'s computed cursor uses `default.png`,
    - a nav link's computed `animation-name` is `maple-cursor-hover`,
    - after `page.mouse.down()`, `<html>` has `data-mouse-down` and the computed cursor uses `pressed.png`. After `mouse.up()`, both are gone.

### Step 3: Push the branch and open a PR ⏳ Not started
- **Requirement:** A GitHub PR from `maple-cursor` into `main`.
- **Why:** Kevin wants this feature reviewed and merged through a PR. CI (lint + e2e) runs on it, and Vercel builds a preview deployment.
- **How:**
  - Once Steps 1–2 are committed and Kevin says to push: `git push -u origin maple-cursor`.
  - Then `gh pr create` with a description of what changed and why, and a manual-check list for the cursor states.
    - No Claude attribution in the PR or the commits.
  - Then check the PR's CI result.
  - Update the plan doc with the PR link and the step commits' hashes.

## Verification
- `npm run test:e2e` (with nvm loaded) passes, including the new `cursor.spec.ts`.
- `npm run lint` is clean.
- The browser pane can't show the OS cursor in screenshots or animation timing, so after the automated checks Kevin tries it on the running `next dev` preview (port 3002, left running):
  - default cursor on the page,
  - animated finger and mouse over nav links and tool cards,
  - pressed finger while the mouse is held down,
  - I-beam in any text field.
  - Check in Chrome and Safari. Safari may only advance the hover animation while the mouse moves. That's acceptable; note it if seen.

## Critical files
- New: `scripts/fetch-cursors.mjs`, `public/cursors/*.png`, `src/app/cursor.css`, `src/components/cursor-press.tsx`, `e2e/cursor.spec.ts`, `docs/plans/02-maple-cursor.md`
- Edited: `src/app/layout.tsx` (import `cursor.css`, render `<CursorPress />`)
- Not touched: `src/app/globals.css`, `theme-script.tsx`, `theme-toggle.tsx` (these mirror the portal)

## Change log
- 2026-11-07: Plan drafted. Sprites found on maplestory.io and checked. Kevin chose committed PNGs, a native CSS cursor, and this app only. The work happens on a `maple-cursor` branch and ends with a PR (Step 3).
- 2026-11-07: Step 1 done: branch `maple-cursor`, `scripts/fetch-cursors.mjs`, and the PNGs in `public/cursors/`.
