// Downloads the MapleStory mouse cursor frames from maplestory.io into
// public/cursors/. The PNGs are committed, so this only needs re-running to
// refresh or change them:
//
//   node scripts/fetch-cursors.mjs
//
// maplestory.io serves game (WZ) data as JSON. A frame's PNG is base64 in
// `value`, and its `origin` child is the hotspot (the pixel that clicks),
// which src/app/cursor.css uses as the `cursor: url(...) x y` coordinates.

import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://maplestory.io/api/wz/GMS/270/UI/Basic.img/Cursor";
const OUT_DIR = new URL("../public/cursors/", import.meta.url);
const TIMEOUT_MS = 10_000;

// File name → WZ path under Basic.img/Cursor ("state/frame").
const FRAMES = {
  default: "0/0", // static pointing finger
  "hover-1": "1/0", // finger + mouse
  "hover-2": "1/1", // finger + mouse, left button red
  pressed: "12/0", // finger pressing, no mouse
};

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function fetchFrame(name, path) {
  const [frame, origin] = await Promise.all([
    getJson(`${BASE}/${path}`),
    getJson(`${BASE}/${path}/origin`),
  ]);
  await writeFile(new URL(`${name}.png`, OUT_DIR), Buffer.from(frame.value, "base64"));
  return { name, path, hotspot: `${origin.value.x} ${origin.value.y}` };
}

await mkdir(OUT_DIR, { recursive: true });
const results = await Promise.all(
  Object.entries(FRAMES).map(([name, path]) => fetchFrame(name, path)),
);
console.table(results);
