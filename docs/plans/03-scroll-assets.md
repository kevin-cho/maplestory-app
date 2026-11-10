# Scroll assets: icons, data, effect frames and sounds

**Status:** 🚧 In progress on branch `scroll-assets`. Step 1 is done (not committed yet). Next: Step 2, waiting for approval.

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
| Requests | 8 at a time, a 10 s timeout and 2 retries each, and a progress line every 50 scrolls | About 870 requests in total. Polite to maplestory.io, about 1–2 minutes, and visibly progressing (not like the slow cursor survey) |

## Steps (each needs approval before it is built)

### Step 1: Branch, plan doc, and share the PNG code ✅ Done
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

### Step 2: Fetch the scroll assets ⏳ Waiting for approval
- **Requirement:**
  - `scripts/fetch-scroll-assets.mjs` downloads everything below.
  - It prints progress and a summary, and lists any IDs that failed.
- **How:**
  - **Icons:** `public/scrolls/icons/{id}.png` (e.g. `2040001.png`), decoded from `metaInfo.icon`.
  - **Data:** `src/data/scrolls.json`, an array sorted by ID with one entry per scroll:
    - `id`, `name`, `description`, `category`, `subCategory`, `success`,
    - plus the remaining `metaInfo` fields, i.e. the stat bonuses and any fields like `cursed`, minus the image fields.
  - **Effects:**
    - Frames go to `public/scrolls/effects/{success,failure}/{00..}.png`.
    - Each animation's frames are padded onto one even-sized canvas, so that every frame's origin lands on the same anchor point.
    - `src/data/scroll-effects.json` records, per animation: frame count, per-frame delays, canvas size and anchor point.
  - **Sounds:** `public/scrolls/sounds/{success,failure}.mp3`.
    - The script strips the WZ header by finding the first MPEG frame sync that's followed by a second valid frame, rather than trusting a fixed 82-byte offset.
  - **Running it:** run in the background with progress output, then report the counts, any IDs that failed, and the total size.

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
- New:
  - plan doc: `docs/plans/03-scroll-assets.md`
  - scripts: `scripts/lib/png.mjs`, `scripts/lib/maplestory-io.mjs`, `scripts/fetch-scroll-assets.mjs`
  - assets: `public/scrolls/**`
  - data: `src/data/scrolls.json`, `src/data/scroll-effects.json`
- Edited: `scripts/fetch-cursors.mjs` (imports the shared helpers)

## Change log
- 2026-11-10: Plan drafted. Assets found on maplestory.io (v83) and previewed. Kevin chose all equipment scrolls, v83, scroll data JSON and sounds. He first asked for no plan doc, then for one as usual.
- 2026-11-10: Step 1 done: branch `scroll-assets`, the shared script helpers, and this doc.
