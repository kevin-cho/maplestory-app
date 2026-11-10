// Downloads the inventory window art and some sample equips from maplestory.io
// (GMS v83, the classic era). The results are committed, so this only needs
// re-running to refresh them:
//
//   node scripts/fetch-inventory-ui.mjs
//
// It writes:
// - public/inventory/equip-window.png and item-window.png: the window
//   backgrounds. The slot positions are baked into the art; they're measured
//   by hand in src/data/inventory-layout.ts.
// - public/inventory/tabs/{equip,use,setup,etc,cash}.png: the Item window's
//   tab labels (white text). The game also has a bolder, wider set
//   (Item/Tab/disabled), but every tab uses this one; the open tab's label is
//   just raised 1 px, like the tab itself.
// - public/inventory/tabs/frame-*.png: the pieces the tab row is built from
//   (UI/Basic.img/Tab2). The window art's tab strip is blank: the game draws
//   the tabs from these pieces in code, then the labels on top.
// - public/inventory/scrollbar/disabled-*.png: the Item window's scrollbar,
//   greyed out (UI/Basic.img/VScr4). Like the tabs, the game draws it in code.
//   The app never has enough items to scroll, so only the greyed-out pieces
//   are saved.
// - public/inventory/items/{id}.png: the sample equips' icons
// - src/data/sample-items.json: their name, category, iconOrigin and stats
//
// Everything is downloaded before any file is touched, so a failed run (exit
// code 1) leaves the committed assets as they were.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { getJson, mapLimit } from "./lib/maplestory-io.mjs";

const VERSION = "GMS/83";
const API = `https://maplestory.io/api/${VERSION}`;
const UI = `https://maplestory.io/api/wz/${VERSION}/UI`;
const CONCURRENCY = 8;

const root = new URL("../", import.meta.url);
const out = (path) => new URL(path, root);

// Tab labels are numbered in the game's tab order
const TABS = ["equip", "use", "setup", "etc", "cash"];

// Tab row pieces, by their WZ names. 0 = an unselected tab, 1 = the selected
// one. `fill` stretches across a tab's label; `left`/`right` are the row's
// ends; `middle` joins two tabs (0: both unselected, 1 and 2: next to the
// selected tab, one for each side).
const TAB_FRAME = ["left0", "left1", "fill0", "fill1", "middle0", "middle1", "middle2", "right0", "right1"];

// Greyed-out scrollbar pieces, by their WZ names: `prev`/`next` are the
// up/down arrows, and `base` tiles down the track
const SCROLLBAR = { disabled: ["prev", "base", "next"] };

// Sample equips to show in the windows: a full classic outfit to wear, plus
// some Maple weapons for the Item window's Equip tab
const SAMPLE_ITEMS = [
  1002357, // Zakum Helmet
  1012000, // Battle Scar
  1022000, // Orange Shades
  1032000, // Weighted Earrings
  1040002, // White Undershirt
  1060002, // Blue Jean Shorts
  1072001, // Red Rubber Boots
  1082002, // Work Gloves
  1092030, // Maple Shield
  1102000, // Green Napoleon
  1122000, // Horntail Necklace
  1302000, // Sword
  1302020, // Maple Sword
  1332025, // Maple Wagner
  1382009, // Maple Staff
  1452022, // Maple Soul Searcher
  1472030, // Maple Claw
];

// Image fields aren't data; the icon is saved as its own file. `iconOrigin` is
// kept as [x, y]: the game aligns icons in their slots by this point.
const IMAGE_FIELDS = new Set(["icon", "iconRaw", "iconOrigin", "iconRawOrigin"]);

const failed = [];
const tryFetch = async (label, fn) => {
  try {
    return await fn();
  } catch (err) {
    failed.push(`${label} (${err.message})`);
    return null;
  }
};

// A WZ image node's `value` is the PNG, base64-encoded
const fetchImage = (path) =>
  tryFetch(path, async () => Buffer.from((await getJson(`${UI}/${path}`)).value, "base64"));

// --- Fetch ---

const started = Date.now();

const windowFiles = new Map(); // file name → PNG
const tabFiles = new Map();
const scrollbarFiles = new Map();
const itemFiles = new Map();

const windowJobs = [
  ["equip-window.png", "UIWindow.img/Equip/backgrnd"],
  ["item-window.png", "UIWindow.img/Item/backgrnd"],
  ...TABS.map((tab, i) => [`${tab}.png`, `UIWindow.img/Item/Tab/enabled/${i}`, true]),
  ...TAB_FRAME.map((piece) => [`frame-${piece}.png`, `Basic.img/Tab2/${piece}`, true]),
];
const scrollbarJobs = Object.entries(SCROLLBAR).flatMap(([state, pieces]) =>
  pieces.map((piece) => [`${state}-${piece}.png`, `Basic.img/VScr4/${state}/${piece}`]),
);
await Promise.all([
  mapLimit(windowJobs, CONCURRENCY, async ([file, path, isTab]) => {
    const png = await fetchImage(path);
    if (png) (isTab ? tabFiles : windowFiles).set(file, png);
  }),
  mapLimit(scrollbarJobs, CONCURRENCY, async ([file, path]) => {
    const png = await fetchImage(path);
    if (png) scrollbarFiles.set(file, png);
  }),
]);

const items = (
  await mapLimit(SAMPLE_ITEMS, CONCURRENCY, (id) =>
    tryFetch(`item ${id}`, async () => {
      const item = await getJson(`${API}/item/${id}`);
      const { icon, iconOrigin, ...meta } = item.metaInfo ?? {};
      if (!icon || !iconOrigin) throw new Error("no icon");
      itemFiles.set(`${id}.png`, Buffer.from(icon, "base64"));
      return {
        id,
        name: item.description?.name ?? null,
        category: item.typeInfo?.category ?? null,
        subCategory: item.typeInfo?.subCategory ?? null,
        iconOrigin: [iconOrigin.x, iconOrigin.y],
        ...Object.fromEntries(Object.entries(meta).filter(([key]) => !IMAGE_FIELDS.has(key))),
      };
    }),
  )
).filter(Boolean);

// --- Write ---

// Empties `dir` and writes `files` (a Map of file name → data) into it
async function replaceDir(dir, files) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await Promise.all([...files].map(([name, data]) => writeFile(new URL(name, dir), data)));
}

if (failed.length) {
  console.log(`Failed:\n  ${failed.join("\n  ")}`);
  console.log(`${failed.length} downloads failed. Nothing was written.`);
  process.exitCode = 1;
} else {
  // replaceDir on public/inventory/ first, since it also holds tabs/ and items/
  await replaceDir(out("public/inventory/"), windowFiles);
  await Promise.all([
    replaceDir(out("public/inventory/tabs/"), tabFiles),
    replaceDir(out("public/inventory/scrollbar/"), scrollbarFiles),
    replaceDir(out("public/inventory/items/"), itemFiles),
    writeFile(out("src/data/sample-items.json"), `${JSON.stringify(items, null, 2)}\n`),
  ]);
  console.log(
    `Windows: ${windowFiles.size}, tabs: ${tabFiles.size}, scrollbar: ${scrollbarFiles.size}, sample items: ${items.length}`,
  );
}
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
