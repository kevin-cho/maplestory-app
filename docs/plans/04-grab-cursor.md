# Grab and holding cursors

**Status:** 🔍 In review: [PR #3](https://github.com/kevin-cho/maplestory-app/pull/3) from branch `grab-cursor`. All steps are done. Next: CI, Kevin's review, and the merge.

## Context
In MapleStory, hovering an inventory item animates the cursor into a grabbing hand. After you click the item it's attached to the cursor, and the cursor stays a static fist while you move it. Kevin wants both cursors ready for the app's future inventory UI, such as the scroll simulator.

**Research (verified 2026-11-10):** both are in the same WZ data as the current cursor (`UI/Basic.img/Cursor`, GMS v270).

| State | Frame | Size | Origin (hotspot) | Delay |
|---|---|---|---|---|
| 5 (grab) | 0: open hand | 27×29 | 6,7 | 250 ms |
| | 1: half-closed | 25×23 | 6,3 | 100 ms |
| | 2: fist | 22×21 | 5,2 | 200 ms |
| | 3: half-closed (identical to frame 1) | 25×23 | 6,3 | 100 ms |
| 11 (holding) | 0: fist (identical to state 5 frame 2) | 22×21 | 5,2 | static |

I surveyed states 2–16 on a contact sheet. The others are dice, house, gift, resize arrows and magnifier cursors, none needed now.

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Where | Extend `fetch-cursors.mjs` and `cursor.css` | Same source, padding and 2× handling as the existing cursor |
| Files | 3 images: `grab-open`, `grab-half` and `grab-close` (`grab-close` also serves as the holding cursor) | Two of the five game frames are exact copies. Descriptive names, like the scroll icons. |
| Alignment | All three on one 28×30 canvas with the hotspot at (6, 8) | Frames with different sizes and origins jump around unless aligned (the cursor lesson). Even numbers keep the 2× halves exact. Because the holding fist is the grab fist, picking an item up doesn't move it. |
| How the app uses them | Tailwind's class names: `cursor-grab` on a draggable item, and `cursor-grabbing` on `<html>` while holding | Same approach as `cursor-pointer`. The names mean "grabbable" and "holding" in CSS. |
| Holding vs. pressing | While holding, the fist shows everywhere, even with the button down | In game the fist stays while you carry an item |
| Reduced motion | Grab hover shows the open hand only | Same as the current hover cursor |

## Steps (each needs approval before it is built)

### Step 1: Branch, plan doc, fetch the frames ✅ Done (commit `f2d2400`)
- **Requirement:**
  - A `grab-cursor` branch and this doc.
  - The grab and holding frames in `public/cursors/`, made by `fetch-cursors.mjs`.
- **Why:** the images have to exist, aligned, before the CSS can use them.
- **How:**
  - Add `grab-open` (5/0), `grab-half` (5/1, `sameAs` 5/3) and `grab-close` (5/2, `sameAs` 11/0) to the script's `FRAMES`. All use canvas 28×30 and hotspot 6,8.
  - The new `sameAs` option checks that those game frames are still identical (same image and origin), and stops the script if one changes.
  - As in the scroll script, everything is downloaded and checked before any file is written.
- **Result:**
  - Created `grab-cursor` from an up-to-date `main` (`ec64d22`).
  - The script prints the shared frames as `5/1 = 5/3` and `5/2 = 11/0`.
  - The existing four cursor PNGs came out byte-identical.
  - Re-fetched all five game frames (including the shared ones): each matches its file pixel for pixel at the game position, and the padding is fully transparent.
  - In a 6× strip (open → half → fist → half → holding) the hotspot stays on the same spot of the hand in every frame.
  - The guard was tested with a deliberately wrong `sameAs` (5/0). It stopped with "5/0 no longer matches 5/1: give it its own entry in FRAMES", exit code 1, and wrote nothing.
  - `eslint scripts/` is clean.

### Step 2: CSS, tests and docs ✅ Done (commit `4192148`)
- **Requirement:**
  - Elements with `cursor-grab` show the looping grab animation.
  - While `<html>` has `cursor-grabbing`, the fist shows everywhere.
- **Why:** the future inventory UI only has to toggle two classes.
- **How:**
  - **`cursor.css`:**
    - A `maple-cursor-grab` animation (650 ms loop, step-end) for `.cursor-grab`: open 0–38.5%, half to 53.8%, fist to 84.6%, then half.
    - A `html.cursor-grabbing` rule (and the same for its descendants) with the fist and `!important`, after the pressed rule. Same specificity and later in the file, so it wins over pressed.
    - The 2× `image-set()` versions with the hotspot halved to `3 4`.
    - Under reduced motion, `.cursor-grab` shows the open hand only.
  - **`e2e/cursor.spec.ts`:**
    - the new images are served,
    - a `cursor-grab` element animates,
    - with `cursor-grabbing` on `<html>`, the body and a link show the fist,
    - holding beats pressing,
    - reduced motion shows the open hand.

    These use stand-in elements, since there's no inventory yet.
  - **README:** a short note on the two classes.
- **Check:** lint, `tsc` and the e2e tests. Then Kevin tries it on the dev preview with a temporary test element.
- **Result:**
  - **`cursor.css`:**
    - the `maple-cursor-grab` keyframes (650 ms, step-end) on `.cursor-grab`,
    - the `html.cursor-grabbing` holding rule after the pressed rule,
    - 2× `image-set()` with hotspot `3 4`,
    - the reduced-motion open hand. That uses `html .cursor-grab`, so it also beats the reduced-motion hover rule on buttons.
    - The fallback keywords are `grab` and `grabbing`, so even without the images the cursor still means the right thing.
  - **e2e:** 4 new tests in a "grab and holding" group, plus the grab images in the served-images and shared-canvas tests.
    - The tests check a stand-in `<div>` and a `<button>` with `cursor-grab`, holding on the body, item and link, holding beating a mouse press, and the reduced-motion open hand.
    - All 27 tests pass, and lint and `tsc` are clean.
  - **Dev preview:** sampled the computed cursor every 10 ms. It goes open (~250 ms) → half (100) → closed (200) → half (100) and loops every 650 ms, matching the game's delays.
    - With `cursor-grabbing` on `<html>`, a link shows the closed hand. All three images load with a 200.
  - **README:** the cursor bullet now explains the automatic states and the two classes for draggable items and held items.
  - **Fix after Kevin tried it:** clicking an item flashed the pressing finger before the closed hand. While the button was down, the page-wide pressed rule beat the grab animation; the item only switched to holding on `click`.
    - New rule `html[data-mouse-down] .cursor-grab` (and the same for its descendants) shows the closed hand while pressing on a grab item. It has one more class than the pressed rule, so it wins. Pressing elsewhere still shows the pressing finger, as in the game.
    - The new e2e test "pressing on an item shows the closed hand" makes 28 in total, all passing. The stand-in items got text so they have a size to hover.
    - In the preview, pressing on an item now gives `grab-close` (it was `pressed`), and the body still shows `pressed`.
  - **Still to check by hand (Kevin):** the feel in his browser, using a DevTools snippet that adds a stand-in item. Click it to pick it up, and click elsewhere to drop it.
  - **Snippet for trying it** (DevTools Console on the dev preview, after a hard reload). It adds a stand-in item: hover it to see the grab, click it to pick it up, and click anywhere else to drop it. Reloading removes it.
    ```js
    const box = Object.assign(document.createElement('div'), { className: 'cursor-grab', textContent: 'Item: hover me, click to pick up' });
    Object.assign(box.style, { position: 'fixed', top: '120px', left: '40px', padding: '24px', border: '2px dashed', background: 'Canvas' });
    document.body.append(box);
    box.addEventListener('click', (e) => { e.stopPropagation(); document.documentElement.classList.add('cursor-grabbing'); });
    document.addEventListener('click', () => document.documentElement.classList.remove('cursor-grabbing'));
    ```
  - Kevin tried it and approved it after the press fix.

### Step 3: Push and open a PR ✅ Done
- **Result:**
  - Pushed `grab-cursor` and opened [PR #3](https://github.com/kevin-cho/maplestory-app/pull/3), with a manual-check list.
  - When this doc was updated, CI had 1 check running.

## Verification
- e2e tests pass. Lint and `tsc` are clean.
- The existing cursors are unchanged.
- Kevin checks the feel on the dev preview: the grab animation, the holding fist, and that pressing while holding keeps the fist.

## Critical files
- Edited: `scripts/fetch-cursors.mjs`, `src/app/cursor.css`, `e2e/cursor.spec.ts`, `README.md`
- New: `public/cursors/{grab-open,grab-half,grab-close}.png`, this doc

## Change log
- 2026-11-10: Plan drafted. Found the grab (state 5) and holding (state 11) cursors and checked them on a contact sheet.
- 2026-11-10: Step 1 done: frames fetched and aligned. Two game frames are shared, so 3 files cover 5 frames, with a `sameAs` guard.
- 2026-11-10: Renamed `fist` to `grab-close` at Kevin's request (briefly `grab-fist`), so all three grab images share the prefix and pair with `grab-open`. Same image, byte-identical.
- 2026-11-10: Step 1 committed (`f2d2400`). Step 2 done: CSS, 4 new e2e tests (27 pass) and a README note. The animation timing was checked in the preview.
- 2026-11-10: Kevin saw the pressing finger flash when clicking an item. Pressing on a grab item now shows the closed hand.
- 2026-11-10: Step 2 committed (`4192148`). Step 3: pushed `grab-cursor` and opened PR #3. Added the DevTools snippet to Step 2.
