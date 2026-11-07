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
import { crc32, deflateSync, inflateSync } from "node:zlib";

const BASE = "https://maplestory.io/api/wz/GMS/270/UI/Basic.img/Cursor";
const OUT_DIR = new URL("../public/cursors/", import.meta.url);
const TIMEOUT_MS = 10_000;

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

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

// --- Minimal PNG read/write: 8-bit RGBA, non-interlaced (what WZ PNGs are) ---

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePng(buf) {
  let pos = 8;
  let header;
  const idat = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    }
    pos += 12 + length;
  }
  const { width, height, bitDepth, colorType, interlace } = header;
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`Unsupported PNG (depth ${bitDepth}, color ${colorType})`);
  }

  // Undo the per-row filters (PNG spec section 9)
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= 4 ? pixels[i - 4] : 0;
      const b = y > 0 ? pixels[i - stride] : 0;
      const c = x >= 4 && y > 0 ? pixels[i - stride - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[i] = (row[x] + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng({ width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  // Filter type 0 (none) on every row
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Copies `image` onto a transparent canvas at (dx, dy)
function pad(image, [width, height], [dx, dy]) {
  if (dx < 0 || dy < 0 || dx + image.width > width || dy + image.height > height) {
    throw new Error(`${image.width}×${image.height} at ${dx},${dy} overflows ${width}×${height}`);
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < image.height; y++) {
    const start = y * image.width * 4;
    image.pixels.copy(pixels, ((y + dy) * width + dx) * 4, start, start + image.width * 4);
  }
  return { width, height, pixels };
}

// --- Fetch, pad and save ---

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
