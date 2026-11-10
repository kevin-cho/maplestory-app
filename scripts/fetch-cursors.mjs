// Downloads the MapleStory mouse cursor frames from maplestory.io into
// public/cursors/. The PNGs are committed, so this only needs re-running to
// refresh or change them:
//
//   node scripts/fetch-cursors.mjs
//
// maplestory.io serves game (WZ) data as JSON. A frame's PNG is base64 in
// `value`, and its `origin` child is the point the game anchors to the mouse
// position, which is the cursor's hotspot (the pixel that clicks).
//
// Each frame is pasted onto a transparent canvas so its hotspot lands on a
// chosen point:
// - Frames of one animation share one canvas and hotspot (the two hover
//   frames; the grab frames and the fist). They differ in size and origin, and
//   browsers round hotspots, so otherwise they drift against each other.
// - Every hotspot and canvas size is even. cursor.css halves them for its 2x
//   image-set(), and halves of even numbers need no rounding.
// The pixel art itself is unchanged; only transparent padding is added.
//
// Everything is downloaded and checked before any file is written, so a failed
// run leaves the committed cursors as they were.

import { mkdir, writeFile } from "node:fs/promises";
import { decodePng, encodePng, pad } from "./lib/png.mjs";
import { getJson } from "./lib/maplestory-io.mjs";

const BASE = "https://maplestory.io/api/wz/GMS/270/UI/Basic.img/Cursor";
const OUT_DIR = new URL("../public/cursors/", import.meta.url);

// File name → WZ path under Basic.img/Cursor ("state/frame"), the canvas size
// and where the hotspot goes on it. Keep `hotspot` in sync with cursor.css.
// `sameAs` lists other game frames that are identical (same image and origin),
// so one file serves them all; the script checks they still match.
const FRAMES = {
  // static pointing finger (24×28, origin 0,3)
  default: { path: "0/0", canvas: [24, 30], hotspot: [0, 4] },
  // finger + mouse (29×30, origin 3,6)
  "hover-1": { path: "1/0", canvas: [30, 30], hotspot: [4, 6] },
  // finger + mouse, left button red (30×28, origin 4,4)
  "hover-2": { path: "1/1", canvas: [30, 30], hotspot: [4, 6] },
  // finger pressing, no mouse (25×23, origin 4,1)
  pressed: { path: "12/0", canvas: [26, 24], hotspot: [4, 2] },
  // Grab animation over draggable items (state 5): open hand → half → fist →
  // half, looping. All on one canvas so the hand doesn't jump between frames.
  // open hand (27×29, origin 6,7)
  "grab-open": { path: "5/0", canvas: [28, 30], hotspot: [6, 8] },
  // half-closed (25×23, origin 6,3); also the 4th frame
  "grab-half": { path: "5/1", canvas: [28, 30], hotspot: [6, 8], sameAs: ["5/3"] },
  // fist (22×21, origin 5,2); also the static "holding an item" cursor
  // (state 11), so picking an item up doesn't move the fist
  "grab-close": { path: "5/2", canvas: [28, 30], hotspot: [6, 8], sameAs: ["11/0"] },
};

// A frame's base64 PNG and origin, as one comparable string
async function getFrame(path) {
  const [frame, origin] = await Promise.all([
    getJson(`${BASE}/${path}`),
    getJson(`${BASE}/${path}/origin`),
  ]);
  return { value: frame.value, origin: origin.value };
}

async function fetchFrame(name, { path, canvas, hotspot, sameAs = [] }) {
  const [{ value, origin }, ...others] = await Promise.all([path, ...sameAs].map(getFrame));
  others.forEach((other, i) => {
    if (other.value !== value || other.origin.x !== origin.x || other.origin.y !== origin.y) {
      throw new Error(`${sameAs[i]} no longer matches ${path}: give it its own entry in FRAMES`);
    }
  });
  const image = decodePng(Buffer.from(value, "base64"));
  const offset = [hotspot[0] - origin.x, hotspot[1] - origin.y];
  const png = encodePng(pad(image, canvas, offset));
  return {
    name,
    png,
    // One row of the summary table
    row: {
      name,
      path: [path, ...sameAs].join(" = "),
      "game size": `${image.width}×${image.height}`,
      origin: `${origin.x},${origin.y}`,
      canvas: canvas.join("×"),
      hotspot: hotspot.join(","),
    },
  };
}

const results = await Promise.all(
  Object.entries(FRAMES).map(([name, frame]) => fetchFrame(name, frame)),
);
await mkdir(OUT_DIR, { recursive: true });
await Promise.all(results.map(({ name, png }) => writeFile(new URL(`${name}.png`, OUT_DIR), png)));
console.table(results.map(({ row }) => row));
