# Equipment and Item inventory windows

**Status:** ✅ All steps built and committed on `inventory-windows` (2026-11-10). Not pushed yet.

## Context
Kevin wants the game's Equipment Inventory and Item Inventory windows in the app, ready for interactions later (hover, click, drag, scrolling an item). The question was whether to download the game's UI art, build components, or both.

**Research (verified 2026-11-10, GMS v83 on maplestory.io):**
- `/api/wz/GMS/83/UI/UIWindow.img/Equip/backgrnd`: 175×304 window with the labelled slot grid (CAP, FOREHEAD, RING ×4, PENDANT, WEAPON, SHIELD, GLOVES, SHOES, PET slots…) and a "EQUIPMENT INVENTORY" title. Origin (0,0).
- `/api/wz/GMS/83/UI/UIWindow.img/Item/backgrnd`: 175×289 window: title, a tab strip, a 4×6 grid of empty slots, a scrollbar track and a mesos bar.
- `Item/Tab/{enabled,disabled}/{0..4}`: the five tab images (22×11): Equip, Use, Set-up, Etc, Cash.
- Also available: `Item/shadow`, `Item/disabled`, `Item/BtSort`, `Item/BtGather`, `Equip/BtPet*`, plus each item's icon via `/api/GMS/83/item/{id}` (`metaInfo.icon` + `iconOrigin`, as the scroll script already uses).
- The windows' `value` is base64 PNG, so the existing `scripts/lib/maplestory-io.mjs` (`getJson`, `mapLimit`) and `scripts/lib/png.mjs` cover the fetching.

## Decisions
| Decision | Choice | Why |
|---|---|---|
| Approach | **Both**: the downloaded window art is the frame; slots, tabs, item icons and mesos are React components positioned on top of it | Pixel art can't be matched well in CSS, but static images can't be interactive. Components over the art give the exact look and a real element per slot for later hover/click/drag. (Kevin chose this.) |
| First version | Static, with a few sample items and working Item-window tabs | Proves the slot layout and icon alignment before adding interactions. (Kevin chose this.) |
| Placement | On the Scroll Simulator page (`/maplestory/scroll`), replacing "Coming soon" | The simulator's flow is "pick an equip, use a scroll", which is exactly these two windows. (Kevin chose this.) |
| Version | GMS v83 | Same as the cursors and scrolls |
| Slot positions | Hand-measured coordinates in `src/data/inventory-layout.ts` (equip slot id → x,y; item grid origin + pitch) | The WZ data has no slot coordinates; they're baked into the art. One typed table keeps them in one place and testable. |
| Scale | Integer only: 2× from `sm` up, 1× on phones, with `image-rendering: pixelated` | 2× = 350 px wide, which doesn't fit a 375 px phone with 16 px gutters. Fractional scales smear pixel art. |
| Item icons | Placed by `iconOrigin`, like the game | Icons range ~29–32 px; without the origin they drift in the slot (the cursor/scroll lesson). |
| Slot markup | Each slot is a component with an accessible name ("Cap slot", "Use slot 3") and `data-slot` | Tests can target slots now, and adding `onClick`/drag later doesn't change the markup. |
| Tab row | Build it from the `UI/Basic.img/Tab2` pieces, with the white labels drawn on top. Every tab uses the same label image (`Item/Tab/enabled`); the open tab's label is raised 1 px, matching its tab, whose top edge is 1 px higher. | Found in Step 2: the window art's tab strip is blank, and the `Item/Tab` images are only the labels. The game draws the tabs in code from these pieces. Kevin chose a 1 px raise over 2 px from a mock, and preferred not to switch to the bolder `disabled` labels. Each tab is its label's width plus 2 px each side. |
| Scrollbar | Always drawn greyed out (the game's `disabled` pieces: up arrow, track, down arrow). No scrolling. | Kevin's requirement: the game always shows the scrollbar area, even with nothing to scroll. Later he decided scrolling isn't needed: the app won't have more than 24 items per tab. The window art has no track (the right-hand strip is blank), so like the tabs it's drawn from `UI/Basic.img/VScr4`, which Kevin picked from a mock. |
| Images | A small `Sprite` component with a plain `<img>`, not `next/image` | The art must show exactly as is, and Next's image optimizer would resample it. Icons also come in many sizes, and `next/image` needs each one's width and height. One `eslint-disable` line in `sprite.tsx` covers it. |
| Scaling | CSS `zoom` on the window (`sm:[zoom:2]`) | Children keep their coordinates in the art's pixels, at any scale. `transform: scale` would leave the layout box at 1×. |
| Equip slot for an item | From the item's `islots` code (`Cp` = cap, `Wp` = weapon…), stored on each slot in the layout table | The game's own data says where an item goes, so there's no separate mapping to keep in sync. |
| Theme | Window art stays as-is in both themes; surrounding page uses existing semantic tokens | The art is the game's own; recolouring it would look wrong. |

## Steps (each needs approval before it is built)

### Step 1: Branch and plan doc ✅ Done
- **Requirement:** branch `inventory-windows` from up-to-date `main`; this plan saved as `docs/plans/05-inventory-windows.md` (status, context, decisions, steps, change log).
- **Why:** same workflow as Plans 01–04.
- **How:** `git switch main && git pull && git switch -c inventory-windows`, write the doc.
- **Result:** created `inventory-windows` from an up-to-date `main` (`629bf77`) and saved this doc. Lint is clean; no app code changed.

### Step 2: Fetch the inventory UI assets ✅ Done (commit `8a5b557`)
- **Requirement:** `scripts/fetch-inventory-ui.mjs` saves to `public/inventory/`:
  - `equip-window.png`, `item-window.png`,
  - `tabs/{equip,use,setup,etc,cash}-{enabled,disabled}.png`,
  - a handful of sample equip icons (e.g. a hat, overall, weapon, shield, shoes) into `public/inventory/items/` with their `iconOrigin` recorded in `src/data/sample-items.json`. Use-tab samples reuse the existing scroll icons.
- **Why:** committed assets, like cursors and scrolls; the app never calls maplestory.io at runtime.
- **How:** reuse `getJson`/`mapLimit` from `scripts/lib/maplestory-io.mjs`; decode base64 PNGs; write everything only after all downloads succeed (same `replaceDir` pattern as `fetch-scroll-assets.mjs`); exit 1 on any failure. Add a line to the README's "Game assets" section.
- **Check:** view each PNG in the scratchpad; re-run leaves `git status` clean.
- **Result:**
  - `scripts/fetch-inventory-ui.mjs` takes about 0.3 s and writes 39 files (172 KB) to `public/inventory/`, plus `src/data/sample-items.json` (9 KB).
  - **Windows:** `equip-window.png` (175×304) and `item-window.png` (175×289).
  - **Tabs (a change from the plan):** the `Item/Tab` images turned out to be just the white text labels (13–27 × 8–11 px), and the window's tab strip is plain light grey. The labels would be nearly invisible on it.
    - The game draws the tab shapes in code from pieces in `UI/Basic.img`. `Tab2` matches: 19 px tall like the strip, grey for unselected tabs and red for the selected one (the red line under the strip in the art is the selected tab's colour).
    - The script also saves those 9 pieces as `tabs/frame-{left,fill,middle,right}*.png`.
    - A scratchpad mock of the row over the window art looked like the game. It confirmed the joins for Step 3: `middle0` joins two unselected tabs, `middle2` goes from an unselected tab into the selected one, and `middle1` goes from the selected tab into an unselected one. The row is 149 px wide starting at x=8, which fits the strip.
  - **Sample items (17 rather than "a handful"):** a full classic outfit to wear (Zakum Helmet, Battle Scar, Orange Shades, Weighted Earrings, White Undershirt, Blue Jean Shorts, Red Rubber Boots, Work Gloves, Maple Shield, Green Napoleon, Horntail Necklace, Sword), plus 5 Maple weapons for the Equip tab.
    - Icons are 26×23 to 37×37, so placing them by `iconOrigin` in Step 3 matters.
    - `sample-items.json` keeps each item's name, category, `iconOrigin` and stats (`incPAD`, `tuc` upgrade slots, `reqLevel`…), which the simulator can use later.
  - **Checks:**
    - The contact sheets of the labels and icons look right.
    - A re-run gives byte-identical files (all 39 checksums match).
    - With an extra item ID that 404s, the script printed the failure and "Nothing was written", exited with code 1, and changed no files.
    - Lint and `tsc` are clean, and all 28 e2e tests pass.
    - The README's "Game assets" section and "Project layout" now cover the new script and folders.
  - **Seen but not fetched:** `Basic.img` also has `ItemNo` (the digits for stack counts), for when the Use tab shows quantities.
- **Addition (requested after Step 2):** the scrollbar is always drawn, greyed out when nothing scrolls.
  - The window art's right-hand strip (x ≈ 150–171, from the red line down to the mesos bar) is blank, so the scrollbar has to come from `UI/Basic.img`. There are 8 styles (`VScr` to `VScr8`), each with `disabled/{prev,base,next}` (12–15 px wide) and `enabled/{prev0,prev1,next0,next1,base,thumb0,thumb1}`.
  - A scratchpad mock compared `VScr` (black-outlined), `VScr3` (light, thin arrows) and `VScr4` (grey rounded) on the window. Kevin picked **`VScr4`**.
  - **Result:** the script now also saves VScr4's 10 pieces to `public/inventory/scrollbar/`, all 15 px wide:
    - `disabled-{prev,base,next}.png` (15×13): grey arrows and track,
    - `enabled-{prev0,prev1,base,next0,next1}.png` (15×13) and `enabled-thumb{0,1}.png` (15×25): blue, with normal (0) and pressed (1) images, for a later plan that turns on scrolling. *(Removed after Step 4: no scrolling is needed, so the script now saves only the 3 disabled pieces.)*
  - In the mock, the scrollbar ran from y=45 to y=257 at x=154. Step 3 will measure the exact spot.
  - **Checks:** the disabled pieces are byte-identical to the ones in the mock, a re-run gives byte-identical files (49 files), lint and `tsc` are clean, and all 28 e2e tests pass. The README mentions `scrollbar/`.

### Step 3: Layout table and slot/window components ✅ Done (commit `cdc7d84`)
- **Requirement:**
  - `src/data/inventory-layout.ts`: equip slot ids + pixel positions measured from the art; item grid origin, pitch (cols 4, visible rows 6), tab positions, mesos text box.
  - `src/components/inventory/`:
    - `inventory-window.tsx`: the frame (art as background, children absolutely positioned, `scale` prop).
    - `item-slot.tsx`: one slot; renders an icon placed by `iconOrigin`, accessible name, `data-slot`.
    - `equip-inventory.tsx`: equip window + a slot per layout entry, filled from an `equipped` prop.
    - `item-inventory.tsx`: item window + tabs (client component, tab state only), 24-slot grid, mesos amount, and the scrollbar: greyed out (disabled pieces) while the tab's items fit in 24 slots.
- **Why:** the reusable pieces the simulator and later interactions build on.
- **How:** plain React + Tailwind; tabs as a proper `tablist` with `aria-selected`; only `item-inventory.tsx` needs `"use client"`. `next/image` `src` paths written with `/maplestory/` (basePath).
- **Result:**
  - **Measured** from upscaled, gridded copies of the art, then confirmed by scanning the pixels. All slots are 32×32.
    - Equip window: a 5 × 7 grid from (5, 35), 33 px apart. 24 of its cells are slots (Cap, Medal, Forehead, 4 Rings, Eye Acc, Ear Acc, Mantle, Clothes, Pendant, Weapon, Shield, Gloves, Pants, Belt, Shoes, the pet and mount slots).
    - Item window: 4 × 6 slots from (8, 50), 36 px apart across and 34 px down. Tab row at (8, 23), 19 px tall (moved to (7, 23) after Step 4). Scrollbar at (153, 50), 15 × 202. Mesos box at (25, 266), 114 × 16.
  - **New files:**
    - `src/data/inventory-layout.ts`: the measurements, the slot list with each slot's `islot` code, `equipSlotFor(islots)`, and the tab widths (the wider of each tab's two label images plus 2 px, so selecting a tab doesn't shift the row).
    - `src/data/items.ts`: the `SlotItem` type (name, icon URL, `iconOrigin`), `getSampleItem`, `equipSlotItem` and `scrollSlotItem`. The scroll data (340 KB) is only read on the server; the client component imports just the type.
    - `src/components/inventory/`: `sprite.tsx`, `inventory-window.tsx` (a `section` with a screen-reader-only `h2`, scaled with `zoom`), `item-slot.tsx` (an `li` with the slot's name and `data-slot`; the icon's origin lands on the slot's bottom-left corner), `equip-inventory.tsx`, `item-inventory.tsx`.
    - The item window has the tab row built from its pieces (with the joins worked out in Step 2), arrow-key movement between tabs, a 24-slot `tabpanel`, the greyed-out scrollbar, and the mesos amount (right-aligned, with "mesos" for screen readers).
  - **Checked** on a temporary page (deleted afterwards), on the dev server already running on port 3002:
    - The label images were first stretched by the button's flex layout. Fixed with `items-start`, and then the row matched the Step 2 mock.
    - The 12 worn items show in their slots, and icons sit in their slots like the game, with the Zakum Helmet overhanging a little as in the game.
    - Clicking the Use tab shows the 5 scrolls. The right arrow moves selection and focus to Set-up, and the left arrow moves back.
    - The page structure has named slots ("Cap", "Slot 1"…), item images by name, a tablist and a tabpanel.
    - Lint and `tsc` are clean, and all 28 e2e tests pass. The inventory tests come with Step 4, when the windows are on a page.
  - **Left for Step 4:** phone width (1×), dark mode, and confirming the tabs' accessible names in Playwright. The browser pane's tree doesn't show names that come from an image's alt text.

### Step 4: Show them on the Scroll Simulator page ✅ Done (commit `f985bc2`)
- **Requirement:** `/maplestory/scroll` shows the page heading, description, and both windows side by side (stacked on phones) with sample items: a few equips worn, scrolls in the Use tab, some mesos.
- **How:** replace `<ComingSoon>` in `src/app/scroll/page.tsx`; keep the `h1` so the existing tool test still passes.
- **Tests (same step):** new `e2e/inventory.spec.ts`:
  - both windows and their images load (no broken images),
  - equip slots exist by name and sample items show in the right ones,
  - clicking the Use tab selects it and shows the scroll icons; Equip tab shows its items,
  - fits at phone width with no horizontal scroll.
  - Update `e2e/tools.spec.ts` so the "Coming soon" test only runs for unbuilt tools.
- **Result:**
  - `src/app/scroll/page.tsx` shows the heading and description, then both windows side by side, wrapping to stacked on narrow screens:
    - 12 items worn (each one's slot comes from `equipSlotFor`, which throws if an item has no slot),
    - 5 Maple weapons in the Equip tab,
    - 5 scrolls in the Use tab (60% and 10% helmet DEF, bow ATT, Chaos Scroll 60%, Spikes on Shoes),
    - 1,234,567 mesos.
  - **Tests:** `e2e/inventory.spec.ts` has 8 tests, which all passed on the first run:
    - every image loads,
    - the equip window has all 24 slots, with the worn items in the right ones and an empty Belt slot,
    - the item window starts on the Equip tab, with 24 slots and 5 items,
    - clicking a tab and pressing the arrow keys switch tabs, select them and move focus (Use shows Chaos Scroll 60% in slot 4; Set-up is empty),
    - the scrollbar uses only the `disabled` pieces,
    - the mesos amount shows,
    - the window is 350 px wide at 1024 px and 175 px at 375 px, with no sideways scrolling on a phone.
  - The tab tests find tabs by name ("Use"), which confirms that Playwright reads each tab's name from its label image.
  - `e2e/tools.spec.ts` has a `BUILT` set. The "Coming soon" test is skipped for `scroll`, and its other test (opens from the home page, title, `h1`) still runs.
  - **Checks:** lint and `tsc` are clean, and the e2e run had 35 passed and 1 skipped.
  - **In the browser** (the dev server on port 3002):
    - **Light:** the windows match the Step 3 preview.
    - **Dark:** the page goes dark and the window art keeps its own colours.
    - **Phone (375 px):** the windows are at 1× (175 px), stacked, with nothing sticking out.
    - The browser pane had a saved "light" theme choice, so I used the page's toggle for dark mode, then restored "light" and the desktop size afterwards.

## Verification
- `npm run lint`, `tsc`, and `npm run test:e2e` (nvm loaded) after each step.
- Browser pane on the dev server (port 3002, left running): `read_page` for structure; one screenshot each at desktop light, dark, and phone width to check that icons sit centred in slots and pixels are crisp.
- Update the plan doc's step results in the same turn; record commit hashes in the next update. Commit/push only when Kevin asks.

### Fix after Step 4: tab labels and spacing ✅ Done
*(First attempt; replaced by the second fix below.)*
- **Requirement:** Kevin said the tabs looked off, especially the open one, whose text looked squished.
- **Cause:** the game names tab labels by whether the tab can be *clicked*. `enabled` is a tab you can still click (unselected), and `disabled` is the open one. I had them the other way round, so the open tab showed the narrow, condensed lettering (e.g. "Use" 13 px wide instead of 16).
- **Fix:**
  - The open tab now uses the `disabled` (bold) label, and the others use `enabled`.
  - Each tab is 2 px wider (the wider label plus 2 px each side, up from 1), so the bold label isn't cramped against the slanted edges.
  - The row is now 162 px wide and starts at x=7, centred in the art's 166 px strip.
  - Before and after, all five tabs were drawn offline at 6× in the scratchpad (`tabrow-now.png`, `tabrow-pad4.png`) and compared.
- **Also:** Kevin decided scrolling isn't needed.
  - The script no longer saves the scrollbar's `enabled` pieces (7 files removed). The README and the component's comment say the scrollbar is always greyed out.
  - Items past 24 in a tab aren't shown.
- **Checks:**
  - A new assertion in the tab test checks that the open tab shows the `disabled` label and the others `enabled`.
  - Lint and `tsc` are clean, and the e2e run had 35 passed and 1 skipped.
  - The page in the browser shows the bold open tab, and the row sits inside the strip.

### Second fix: one label image, raised on the open tab ✅ Done
- **Requirement:** Kevin said labels shouldn't get bigger or bolder when their tab opens. The label should just move up slightly.
- **Cause:** the first fix used the game's bolder, wider `disabled` labels for the open tab. Using two label sets was the real problem: whichever tab had the other set looked out of place (squished in the first version, too big in the second).
- **Fix:**
  - Every tab uses the same label (`Item/Tab/enabled`), and the open tab's label is raised 1 px.
  - The 1 px matches the tab pieces: the open tab's top edge is at y=0 and the others' at y=1. A 6× mock showed 1 px and 2 px, and Kevin picked 1 px.
  - Each tab is its label's width plus 2 px each side (26, 17, 30, 17, 24). The row is 154 px wide, back at x=8.
  - The script saves only the one label set, as `tabs/{equip,use,setup,etc,cash}.png` (5 files removed).
- **Checks:**
  - The tab test now checks that the open tab's label sits 2 CSS px (1 art pixel at 2×) above the others.
  - Lint and `tsc` are clean, and the e2e run had 35 passed and 1 skipped.
  - On the page with Use open, all five labels are the same image, and Use's sits 2 px higher.

## Later (separate plans)
- Hover tooltips with item stats, click-to-select, drag between slots, sort/gather buttons, and wiring scrolls onto equips for the simulator itself.
- Not planned: scrolling the Item window. Kevin doesn't expect more than 24 items per tab.

## Critical files
- New: `docs/plans/05-inventory-windows.md`, `scripts/fetch-inventory-ui.mjs`, `public/inventory/**`, `src/data/inventory-layout.ts`, `src/data/items.ts`, `src/data/sample-items.json`, `src/components/inventory/*`, `e2e/inventory.spec.ts`
- Edited: `src/app/scroll/page.tsx`, `e2e/tools.spec.ts`, `README.md` (Step 2)
- Reused: `scripts/lib/maplestory-io.mjs`, `scripts/lib/png.mjs`, `public/scrolls/icons/*`, `src/data/scrolls.json`

## Change log
- 2026-11-10: Plan drafted. Window art found on maplestory.io (v83) and previewed. Kevin chose art + components, a static first version with sample items, and the Scroll Simulator page.
- 2026-11-10: Kevin approved the plan. Step 1 done: branch `inventory-windows` and this doc.
- 2026-11-10: Step 2 done: inventory assets fetched. The tab labels needed the tab-row pieces from `UI/Basic.img/Tab2`, so the script saves those too. There are 17 sample items.
- 2026-11-10: Kevin asked for the scrollbar area to always show, greyed out when nothing scrolls. Added to the decisions, Step 2 (fetch) and Step 3 (render). The style is pending his pick from a mock.
- 2026-11-10: Kevin picked the `VScr4` scrollbar. The script now saves its disabled and enabled pieces.
- 2026-11-10: Step 3 done: layout table, item helpers and the inventory components, checked on a temporary page. Added decisions for `Sprite`, `zoom` and `islots`.
- 2026-11-10: Step 4 done: both windows are on the Scroll Simulator page with sample contents, with 8 new e2e tests. Checked in light, dark and at phone width.
- 2026-11-10: Kevin found the open tab's text squished. The label images were swapped (the game's `disabled` = the open tab) and the tabs widened by 2 px. He also decided scrolling isn't needed, so only the greyed-out scrollbar pieces are kept.
- 2026-11-10: Kevin said labels shouldn't change when their tab opens, only move up slightly. Every tab now uses one label set, and the open tab's label is raised 1 px (his pick from a 1 px / 2 px mock). The bolder labels are no longer fetched.
- 2026-11-10: Committed on `inventory-windows`, one commit per step and then this doc. Both tab fixes are part of Steps 2–4. Step 1's branch and this doc are in the doc's own commit; its hash goes in the next update.
