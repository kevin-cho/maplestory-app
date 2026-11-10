# Scroll assets: icons, data, effect frames and sounds

**Status:** 🚧 In progress on branch `scroll-assets`. Steps 1–3 are done (Steps 2–3 not committed yet). All assets are downloaded and documented.

## Context
Kevin wants assets ready for the future scroll simulator:
- every equipment scroll's icon and data,
- the success and failure effect animations,
- their sounds.

All of it comes from GMS v83 (the classic era) on maplestory.io. This only adds files to the repo; no UI uses them yet.

**Research (verified 2026-11-10):**
- **Scroll list:** `/api/wz/GMS/83/Item/Consume/0204.img` lists 754 equipment scroll IDs (e.g. `02040001`).
- **One request per scroll:** `/api/GMS/83/item/{id}` returns
  - `description.name` and `description.description`,
  - `typeInfo.category` and `subCategory` (e.g. "Armor Scroll" / "Helmet"),
  - `metaInfo.success` (the success %) and the stat bonuses (`incPDD`, `incMDD`, …),
  - `metaInfo.icon` (base64 PNG; the inventory icon).
- **Effects:** `/api/wz/GMS/83/Effect/BasicEff.img/Enchant/{Success,Failure}`.
  - Success has 21 frames and Failure has 16. The frames are different sizes (for example 127×108 and 64×72).
  - Each frame has its own `origin` and a `delay` (50 ms).
  - I previewed them: gold sparkles for success, a dark smoke puff for failure.
- **Sounds:** `/api/wz/GMS/83/Sound/Game.img/EnchantSuccess` and `/EnchantFailure`.
  - `value` is base64: an 82-byte WZ header, then plain MP3 frames.

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Scope | All 754 equipment scrolls | Cheap (~1 MB), so no coming back later |
| Version | GMS v83 | The classic era Classic World is modelled on |
| Effect frames | Pad each animation's frames onto one shared canvas with one anchor point, with even sizes | The lesson from the cursor: frames with different sizes and origins drift unless they're aligned. Even numbers keep a later 2× display exact. |
| Data | `src/data/scrolls.json` | It comes free with the icon request, and code will import it later |
| Icons | Save each distinct icon once, under a **name by appearance** (`blue`, `red`, `chaos`, `dragon-stone`…). Each scroll's `icon` field names its file. | 754 scrolls share just 22 icons. Names by look are readable. Success-rate names would mislead: e.g. the yellow icon is used by both 10% and 100% scrolls. |
| Requests | 8 at a time, a 10 s timeout and 2 retries each, and a progress line every 50 scrolls | About 870 requests in total. Polite to maplestory.io, about 1–2 minutes, and visibly progressing (not like the slow cursor survey) |

## Steps (each needs approval before it is built)

### Step 1: Branch, plan doc, and share the PNG code ✅ Done (commit `e6cccc9`)
- **Requirement:**
  - A new `scroll-assets` branch.
  - `docs/plans/03-scroll-assets.md` (this plan, with status, decisions, steps and a change log, like Plans 01 and 02).
  - The PNG read/write and padding helpers are reusable by both scripts.
- **Why:** the effect frames need the same decode, pad and encode work as the cursors. One copy is easier to keep correct than two.
- **How:**
  - `git switch main && git pull`, then `git switch -c scroll-assets`.
  - Move `decodePng`, `encodePng` and `pad` from `scripts/fetch-cursors.mjs` into `scripts/lib/png.mjs`. `fetch-cursors.mjs` imports them from there.
  - Also move `getJson`, into `scripts/lib/maplestory-io.mjs`, with retries plus a small concurrency-limited `mapLimit` helper.
  - **Check:** re-run `fetch-cursors.mjs`. The cursor PNGs must come out byte-identical (`git status` shows no change).
- **Result:**
  - Created `scroll-assets` from an up-to-date `main` (`c0f5ed8`).
  - Added `scripts/lib/png.mjs` (`decodePng`, `encodePng`, `pad`) and `scripts/lib/maplestory-io.mjs`:
    - `getJson` has a 10 s timeout and 2 retries with backoff. A 404 isn't retried.
    - `mapLimit` is like `Promise.all`, with a concurrency cap.
  - `fetch-cursors.mjs` now imports these. Re-running it left the four cursor PNGs byte-identical (`git status` shows no change).
  - `eslint scripts/` is clean.

### Step 2: Fetch the scroll assets ✅ Done
- **Requirement:**
  - `scripts/fetch-scroll-assets.mjs` downloads everything below.
  - It prints progress and a summary, and lists any IDs that failed.
- **How:**
  - **Icons:** decoded from `metaInfo.icon`.
    - They're grouped by their bytes plus `iconOrigin`, and each distinct icon is saved once as `public/scrolls/icons/{name}.png`.
    - The name comes from `ICON_NAMES` in the script, keyed by the lowest scroll ID that uses the icon.
    - If a re-run finds an icon with no name, the script stops and names the scroll, so new art can't slip in unnamed.
    - Each scroll's `icon` field gives the name, so code shows `/maplestory/scrolls/icons/${scroll.icon}.png`.
  - **Data:** `src/data/scrolls.json`, an array sorted by ID with one entry per scroll:
    - `id`, `icon` (the icon's name), `name`, `description`, `category`, `subCategory`, `success`, `iconOrigin`,
    - plus the remaining `metaInfo` fields, i.e. the stat bonuses and any fields like `cursed`, minus the image fields.
  - **Effects:**
    - Frames go to `public/scrolls/effects/{success,failure}/{00..}.png`.
    - Each animation's frames are padded onto one even-sized canvas, so that every frame's origin lands on the same anchor point.
    - `src/data/scroll-effects.json` records, per animation: frame count, per-frame delays, canvas size and anchor point.
  - **Sounds:** `public/scrolls/sounds/{success,failure}.mp3`.
    - The script strips the WZ header by finding the first MPEG frame sync that's followed by a second valid frame, rather than trusting a fixed 82-byte offset.
  - **Running it:** run in the background with progress output, then report the counts, any IDs that failed, and the total size.
- **Result:**
  - **Run:** the first run took 10.7 s, much faster than the 1–2 minutes expected. All 754 scrolls were saved, and none failed.
  - **Icons:** 754 scrolls share just **22 distinct icons**. Kevin spotted the repeats, and the script now saves each one once.
    - That's 22 files and 19 KB instead of 754 files and 678 KB (3.1 MB on disk). `public/scrolls/` is 280 KB in total.
    - **Names, by appearance:**
      - Plain scrolls by colour: `blue` (100%), `red` (60%), `yellow` (10%, plus 29 100% scrolls), `dark-gray` (dark 70%), `dark-purple` (dark 30%), `pink` (50%).
      - `red-sparkle` (65%), `yellow-sparkle` (15%), and `white-maple` (mixed and event scrolls).
      - Objects: `bandage`, `spikes`, `log` (Balrog's), `flame`, `dragon-stone`, `marble`, `rock-of-wisdom`, `clean-slate`, `chaos`, `tree-sap`, `maple-syrup`.
      - `accessory-dark-70` and `accessory-dark-30` look almost identical, so they're named by use.
    - Checked against the per-scroll icons from the first run: every scroll's `icon` file is byte-identical to the image it had, and no file is missing or unused.
    - The unknown-icon guard was tested by removing `maple-syrup` from a temporary copy of the script. It stopped with "New icon first used by 2049102 "Maple Syrup 100%": add a name for it to ICON_NAMES".
    - The largest group (120 scrolls) mixes 10% and 100% scrolls, so the icon styles don't map cleanly to success rates.
  - **Scroll data:**
    - 754 unique IDs, all named: 477 armor, 259 weapon and 18 special scrolls.
    - Spot checks match, e.g. 2040001 "Scroll for Helmet for DEF" at 60%, and 2044501 "Scroll for Bow for ATT" at 60%.
    - 219 scrolls have `cursed` (the dark scrolls' destroy chance).
    - Stat bonuses are the `inc*` fields (`incPAD`, `incSTR`, …). The descriptions don't always match them (2040001's text says magic DEF +2, while `incMDD` is 1), so code should trust the `inc*` fields.
  - **Changes from the plan:** icons are de-duplicated (above), and `iconOrigin` is kept in `scrolls.json` as `[x, y]`.
    - Icons vary from 29×28 to 32×31, and the game aligns them in inventory slots by this point. Without it they'd drift, like the cursor did.
  - **Effects:**
    - Success: 21 frames, a 166×190 canvas and 1.1 s in total. Failure: 16 frames, a 110×150 canvas and 0.85 s. All frames are 50 ms.
    - The anchor (84,196 and 62,156) sits *below* the canvas. That's expected: the game anchors these effects at the character's feet and draws them above.
    - Re-fetching the originals confirmed every frame keeps its pixels at the right offset, with fully transparent padding.
    - The contact sheets look right. Success: the scroll flares, becomes a white maple leaf, then gold sparkles. Failure: the scroll darkens, burns, and scatters into smoke.
  - **Sounds:** the WZ header was 82 bytes in both. `afinfo` reads them as valid MP3 (mono, 22 kHz, 24 kbps): success 1.9 s, failure 2.2 s. Both played fine.
  - **App:** lint and `tsc` are clean, and all 23 e2e tests pass.

### Step 3: Document the asset scripts in the README ✅ Done
- **Requirement:** the README explains the asset scripts: what each one downloads, where the files go, and how to run them.
- **Why:** Kevin asked. Both scripts are re-run only occasionally, so how to use them is easy to forget.
- **How:** in the main README rather than a `scripts/README.md`.
  - With two scripts the section stays short, and the main README already covers development and tests.
  - A separate README makes sense if the scripts grow.
- **Result:**
  - The README has a new "Game assets" section after "Tests". It covers:
    - where the assets come from, and that they're committed,
    - the two commands,
    - what each script writes,
    - what to do when the scroll script stops with "New icon…",
    - the shared `scripts/lib/` helpers,
    - a hard-reload tip for cached images.
  - "Project layout" now lists `scripts/`, `public/cursors/`, `public/scrolls/`, the `src/data/*.json` files and `cursor.css`.
  - Every path it mentions exists, and both commands ran exactly as written, leaving no changes.
  - Also fixed the scroll script's header comment, which said it takes "a minute or two". It takes a few seconds.

## Verification
- **Counts:** 754 icons, or the script lists the missing IDs, and `scrolls.json` has the same number of entries. Spot-check a few against known scrolls, e.g. 2040001 = "Scroll for Helmet for DEF", 60%.
- **Effects:**
  - Every padded frame keeps its original pixels.
  - View a contact sheet of the frames, upscaled, in the scratchpad.
  - Check the anchor alignment the same way as the cursor frames.
- **Sounds:** `afinfo` reads both `.mp3` files as valid MP3, with a sensible duration. Play them with `afplay`, so Kevin can listen too.
- **Cursor refactor:** `fetch-cursors.mjs` output is unchanged.
- **App:** `npm run lint` and `npm run test:e2e` still pass (no app code changes).
- Update the plan doc with each step's results, and record commit hashes in the next update.
- Commit and push only when Kevin asks.

## Critical files
- Edited: `README.md` (Step 3)
- New:
  - plan doc: `docs/plans/03-scroll-assets.md`
  - scripts: `scripts/lib/png.mjs`, `scripts/lib/maplestory-io.mjs`, `scripts/fetch-scroll-assets.mjs`
  - assets: `public/scrolls/**`
  - data: `src/data/scrolls.json`, `src/data/scroll-effects.json`
- Edited: `scripts/fetch-cursors.mjs` (imports the shared helpers)

## Change log
- 2026-11-10: Plan drafted. Assets found on maplestory.io (v83) and previewed. Kevin chose all equipment scrolls, v83, scroll data JSON and sounds. He first asked for no plan doc, then for one as usual.
- 2026-11-10: Step 1 done: branch `scroll-assets`, the shared script helpers, and this doc.
- 2026-11-10: Step 1 committed (`e6cccc9`). Step 2 done: all assets downloaded and checked. `iconOrigin` kept in the scroll data.
- 2026-11-10: Kevin noticed duplicate icons (22 distinct out of 754). Step 2 and its script now save each distinct icon once, with an `icon` field per scroll.
- 2026-11-10: Kevin asked for semantic icon names. The icons are now named by appearance (`blue`, `red`, `chaos`…) from a table in the script.
- 2026-11-10: Step 3 added and done: the asset scripts are documented in the README.
