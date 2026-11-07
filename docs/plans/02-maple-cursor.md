# MapleStory mouse cursor

**Status:** 🔍 In review: [PR #1](https://github.com/kevin-cho/maplestory-app/pull/1) from branch `maple-cursor`. All steps are built. Next: CI, Kevin's review, and the merge.

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
| Hotspots | Use each frame's WZ `origin`, padded onto shared, even-numbered canvases (Step 2c) | The click point matches the fingertip exactly as in game. The hover frames' hotspots differ by 1–2 px, which is also how the game does it. |
| Reduced motion | Under `prefers-reduced-motion: reduce`, show hover frame A only (no animation) | Accessibility |
| Text fields | ~~Keep the I-beam~~ → the default finger (Step 2b) | Kevin prefers it, and it matches the game |
| Retina | ~~1× images only~~ → mark the images as 2× on high-density screens with `image-set()` (Step 2b) | At 1× the cursor looked too big and blurry on a Retina Mac |

## Steps (each needs approval before it is built)

### Step 1: Download and commit the cursor images ✅ Done (commit `617f354`)
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

### Step 2: Apply the cursor with CSS, plus a press listener ✅ Done (commit `8147a71`, together with 2b and 2c)
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
- **Result:**
  - Built as planned. Two additions:
    - Tailwind's `.cursor-pointer` counts as clickable too, so any element styled that way gets the hover cursor.
    - The rules are unlayered, so they win over Tailwind's layered utilities.
  - `cursor.spec.ts` has 6 tests. Besides the planned checks, it covers the I-beam in a text field and the reduced-motion still frame.
  - All 21 e2e tests pass, and lint and `tsc` are clean.
  - The `next dev` preview shows the same computed cursors, and every cursor image loads with a 200.
  - Still to check by hand (Kevin): how it feels in Chrome and Safari.
  - A side effect, faithful to the game: plain text shows the finger rather than an I-beam, though it can still be selected.

### Step 2b: Smaller, sharper cursor, and the finger in text fields ✅ Done (commit `8147a71`)
- **Requirement:**
  - The cursor is smaller and crisp on Kevin's Retina screen.
  - Text fields show the default finger instead of the I-beam.
- **Why:** Kevin tried Step 2:
  - The cursor was much too big and a bit blurry.
  - He wants the game's finger in text fields as well.
- **Cause of the size and blur:** browsers treat a cursor image as 1×.
  - On a 2× (Retina) screen, the 24×28 finger becomes 24×28 *points* (48×56 screen pixels): twice the game's size.
  - That upscale is smoothed, which is the blur.
- **How:**
  - **Size:** declare each image with `image-set(url(...) 1x, url(...) 2x)`, the same file for both entries.
    - On a 2× screen the browser picks the 2x entry and draws one image pixel per screen pixel. That's the game's size, half of today's, and perfectly sharp.
    - On a 1× screen nothing changes (already 1:1).
    - The images stay untouched. Shrinking the PNGs themselves would wreck the pixel art.
    - A plain `url()` line stays in front as a fallback for browsers without `image-set()` in `cursor`.
  - **Hotspots:** on the 2x entry, halve them: default `0 1.5`, hover-1 `1.5 3`, hover-2 `2 2`, pressed `2 0.5`.
    - ⚠️ The spec doesn't say whether hotspots count image pixels or points for a 2× image. Halving is the likely reading.
    - Either way the error is at most 3 px, but Kevin should check that clicks land at the fingertip, e.g. on a button's edge.
  - **Text fields:** drop the `cursor: text` rule. Instead give `input`, `textarea` and `[contenteditable]` the default finger explicitly.
    - Browsers can otherwise switch to the I-beam on their own.
    - Clickable inputs (checkbox, radio, submit) still get the hover animation, because the animation wins.
  - **Tests:** change "text fields keep the I-beam" to "text fields use the pointing finger".
    - The other cursor tests still apply. They check file names, which `image-set()` keeps.
- **If it's still blurry or the wrong size:** reevaluate. Options include a 1.5× density (smaller still, but not pixel-perfect).
- **Result:**
  - Built as planned, with one fix along the way. Under reduced motion, the hover rule uses `:is()` instead of `:where()`. Otherwise the new plain `input` rule would win for checkboxes, because `:where()` has zero specificity.
  - **Hotspot rounding:** Chrome rounds hotspots down to whole numbers (`0 1.5` became `0 1`).
    - That's half a point (one screen pixel on Retina) above the planned spot. Harmless, so the halved values stay.
  - **Tests:** there's a new test that the cursor declares a 2x entry. Chrome reports it as `2dppx`, the same unit.
    - The text-field test now checks the finger on `input` and `textarea`, and the hover animation on a checkbox.
    - The reduced-motion test also covers a checkbox.
  - All 22 e2e tests pass, and lint and `tsc` are clean. The dev preview shows the new rules.
  - Still to check by hand (Kevin): the size and sharpness on Retina, and that clicks land at the fingertip.

### Step 2c: Keep the hover frames aligned ✅ Done (commit `8147a71`)
- **Requirement:** in the hover animation, the mouse icon stays put between the two frames, and only the finger moves, as in game.
- **Why:** Kevin sees the mouse icon shifting between the frames.
- **Cause (measured):**
  - Placed with the game's origins, the two frames' mouse icons line up exactly. The opaque pixels overlap best at a (0, 0) offset, and only the finger differs.
  - The frames have different sizes and origins, though (A: 29×30 at 3,6; B: 30×28 at 4,4).
  - Step 2b halved the hotspots for the 2× `image-set()`. Chrome rounds them down to whole numbers, so frame A's 1.5 became 1.
  - That moves frame A one image pixel against frame B. Chrome may also count hotspots in image pixels rather than points; either way the frames end up misaligned.
- **How:** make the hotspot identical, and even, in both hover frames, so rounding and units no longer matter.
  - `scripts/fetch-cursors.mjs` pastes each frame onto a transparent canvas, so that:
    - both hover frames share one 30×30 canvas with the hotspot at (4, 6), the larger of their two origins. A is offset by (1, 0) and B by (0, 2), exactly the game's relative placement.
    - every other cursor's hotspot is also even, so halving is exact. Default goes from (0, 3) to (0, 4), and pressed from (4, 1) to (4, 2), each with one transparent row added on top.
  - The pasting needs a small PNG read/write with Node's built-in `zlib`, so no new dependencies. Then re-run the script.
  - The pixel art itself isn't touched; the canvases only gain transparent padding.
  - **`cursor.css`:**
    - hover uses `4 6` (2x entry `2 3`) for both frames,
    - default uses `0 4` (`0 2`),
    - pressed uses `4 2` (`2 1`).
    - All are whole numbers now, so Chrome doesn't round them.
  - **Tests:** add one that both hover PNGs have the same size, and keep the existing ones.
    - A computed-style test can't see alignment. Kevin's eyes are the real check.
- **Result:**
  - Built as planned. The canvas sizes are even as well (default 24×30, hover 30×30, pressed 26×24), so the 2× size is a whole number of points too.
  - **Pixel check:** each padded PNG keeps every original pixel, and the padding is fully transparent.
    - In the two hover frames, the mouse icon's outline sits in identical positions, and the best-overlap offset is (0, 0).
  - **Tests:** the new test checks that both hover PNGs are the same size.
    - All 23 e2e tests pass, and lint and `tsc` are clean.
    - The dev preview shows the new whole-number hotspots.

### Step 3: Push the branch and open a PR ✅ Done
- **Requirement:** A GitHub PR from `maple-cursor` into `main`.
- **Why:** Kevin wants this feature reviewed and merged through a PR. CI (lint + e2e) runs on it, and Vercel builds a preview deployment.
- **How:**
  - Once Steps 1–2 are committed and Kevin says to push: `git push -u origin maple-cursor`.
  - Then `gh pr create` with a description of what changed and why, and a manual-check list for the cursor states.
    - No Claude attribution in the PR or the commits.
  - Then check the PR's CI result.
  - Update the plan doc with the PR link and the step commits' hashes.
- **Result:**
  - Pushed `maple-cursor` and opened [PR #1](https://github.com/kevin-cho/maplestory-app/pull/1). Its description has a manual-check list for the cursor states.
  - When this doc was updated, CI had 1 check passing and 1 still running.
  - **Finding on caching:** while testing Step 2c, hot reload swapped the CSS but the browser kept the old images. Old images with new hotspots looked misaligned until a hard reload.
    - This doesn't affect visitors, since only the final images get deployed.
    - If the images change after launch, add a version query (e.g. `?v=2`) to their URLs.

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
- 2026-11-07: Step 1 committed (`617f354`). Step 2 done: `cursor.css`, `CursorPress` and `e2e/cursor.spec.ts`. All e2e tests pass.
- 2026-11-07: After trying Step 2, Kevin found the cursor too big and blurry and wants the finger in text fields. Added Step 2b.
- 2026-11-07: Step 2b built (2× `image-set()`, the finger in text fields). All 22 e2e tests pass.
- 2026-11-07: Kevin saw the hover frames shift. Measured the cause (hotspot rounding with different frame sizes) and added Step 2c.
- 2026-11-07: Step 2c built: padded frames with shared, even hotspots. All 23 e2e tests pass.
- 2026-11-07: Steps 2–2c committed (`8147a71`). Step 3: pushed `maple-cursor` and opened PR #1.
