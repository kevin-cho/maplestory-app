// Minimal PNG read/write for the asset scripts: 8-bit RGBA, non-interlaced,
// which is what maplestory.io's WZ images are. Uses only Node's zlib, so the
// scripts need no image library.

import { crc32, deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Decodes a PNG into { width, height, pixels } (RGBA bytes, row by row). */
export function decodePng(buf) {
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

/** Encodes { width, height, pixels } (RGBA) as a PNG. */
export function encodePng({ width, height, pixels }) {
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

/** Copies `image` onto a transparent canvas of [width, height] at [dx, dy]. */
export function pad(image, [width, height], [dx, dy]) {
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
