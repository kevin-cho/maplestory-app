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
// - Both hover frames share one canvas and hotspot. They differ in size and
//   origin, and browsers round hotspots, so otherwise they drift against each
//   other and the mouse icon jumps between frames.
// - Every hotspot and canvas size is even. cursor.css halves them for its 2x
//   image-set(), and halves of even numbers need no rounding.
// The pixel art itself is unchanged; only transparent padding is added.

import { mkdir, writeFile } from "node:fs/promises";
import { decodePng, encodePng, pad } from "./lib/png.mjs";
import { getJson } from "./lib/maplestory-io.mjs";

const BASE = "https://maplestory.io/api/wz/GMS/270/UI/Basic.img/Cursor";
const OUT_DIR = new URL("../public/cursors/", import.meta.url);

// File name → WZ path under Basic.img/Cursor ("state/frame"), the canvas size
// and where the hotspot goes on it. Keep `hotspot` in sync with cursor.css.
const FRAMES = {
  // static pointing finger (24×28, origin 0,3)
  default: { path: "0/0", canvas: [24, 30], hotspot: [0, 4] },
  // finger + mouse (29×30, origin 3,6)
  "hover-1": { path: "1/0", canvas: [30, 30], hotspot: [4, 6] },
  // finger + mouse, left button red (30×28, origin 4,4)
  "hover-2": { path: "1/1", canvas: [30, 30], hotspot: [4, 6] },
  // finger pressing, no mouse (25×23, origin 4,1)
  pressed: { path: "12/0", canvas: [26, 24], hotspot: [4, 2] },
};

async function fetchFrame(name, { path, canvas, hotspot }) {
  const [frame, origin] = await Promise.all([
    getJson(`${BASE}/${path}`),
    getJson(`${BASE}/${path}/origin`),
  ]);
  const image = decodePng(Buffer.from(frame.value, "base64"));
  const offset = [hotspot[0] - origin.value.x, hotspot[1] - origin.value.y];
  await writeFile(new URL(`${name}.png`, OUT_DIR), encodePng(pad(image, canvas, offset)));
  return {
    name,
    path,
    "game size": `${image.width}×${image.height}`,
    origin: `${origin.value.x},${origin.value.y}`,
    canvas: canvas.join("×"),
    hotspot: hotspot.join(","),
  };
}

await mkdir(OUT_DIR, { recursive: true });
const results = await Promise.all(
  Object.entries(FRAMES).map(([name, frame]) => fetchFrame(name, frame)),
);
console.table(results);
