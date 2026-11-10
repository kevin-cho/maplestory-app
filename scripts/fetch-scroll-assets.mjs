// Downloads the scroll assets for the scroll simulator from maplestory.io
// (GMS v83, the classic era). The results are committed, so this only needs
// re-running to refresh them:
//
//   node scripts/fetch-scroll-assets.mjs
//
// It writes:
// - public/scrolls/icons/{name}.png: the scroll icons. Many scrolls share an
//   icon (754 scrolls, 22 distinct icons in v83), so each distinct icon is
//   saved once, under a name from ICON_NAMES.
// - src/data/scrolls.json: each scroll's name, success rate, stat bonuses…,
//   and `icon`: which icon file it uses
// - public/scrolls/effects/{success,failure}/NN.png: the effect animations
// - src/data/scroll-effects.json: frame delays, canvas size and anchor point
// - public/scrolls/sounds/{success,failure}.mp3: the matching sounds
//
// About 870 requests, run 8 at a time; it takes a few seconds.

import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { decodePng, encodePng, pad } from "./lib/png.mjs";
import { getJson, mapLimit } from "./lib/maplestory-io.mjs";

const VERSION = "GMS/83";
const API = `https://maplestory.io/api/${VERSION}`;
const WZ = `https://maplestory.io/api/wz/${VERSION}`;
const CONCURRENCY = 8;

const root = new URL("../", import.meta.url);
const out = (path) => new URL(path, root);

// --- Scrolls: icons and data ---

// Image fields aren't data; the icon is saved as its own file. `iconOrigin` is
// kept (as iconOrigin: [x, y]): icons differ in size, and the game aligns them
// in inventory slots by this point.
const IMAGE_FIELDS = new Set(["icon", "iconRaw", "iconOrigin", "iconRawOrigin"]);

// Names for the distinct icons, by appearance, keyed by the lowest scroll ID
// that uses each one. Success rates don't work as names: e.g. the yellow
// scroll is the 10% icon, but some 100% scrolls use it too.
const ICON_NAMES = {
  2040000: "blue", // 100% scrolls
  2040001: "red", // 60%
  2040002: "yellow", // 10%, and some 100%
  2040008: "dark-gray", // dark 70%
  2040009: "dark-purple", // dark 30%
  2040019: "red-sparkle", // 65%
  2040020: "yellow-sparkle", // 15%
  2040023: "white-maple", // mixed and event scrolls
  2040045: "pink", // 50%
  2040110: "bandage", // Red-Nose bandages
  2040727: "spikes", // Scroll for Spikes on Shoes
  2040728: "log", // Balrog's scrolls
  2041058: "flame", // Scroll for Cape for Cold Protection
  2041200: "dragon-stone",
  2041211: "marble", // Spiegelmann's Marble
  2041212: "rock-of-wisdom",
  2049000: "clean-slate",
  2049100: "chaos",
  2049101: "tree-sap", // Liar Tree Sap
  2049102: "maple-syrup",
  2049200: "accessory-dark-70", // near-identical to the 30% one
  2049201: "accessory-dark-30",
};

async function fetchScrolls() {
  // Item/Consume/0204.img holds every equipment scroll, named like "02040001"
  const { children } = await getJson(`${WZ}/Item/Consume/0204.img`);
  const ids = children.map(Number).sort((a, b) => a - b);
  console.log(`Scrolls: ${ids.length} to fetch`);

  await rm(out("public/scrolls/icons/"), { recursive: true, force: true });
  await mkdir(out("public/scrolls/icons/"), { recursive: true });

  let done = 0;
  const failed = [];
  const scrolls = await mapLimit(ids, CONCURRENCY, async (id) => {
    try {
      const item = await getJson(`${API}/item/${id}`);
      const { icon, ...meta } = item.metaInfo ?? {};
      if (!icon) throw new Error("no icon");
      return {
        id,
        icon: null, // filled in below, once the distinct icons are known
        name: item.description?.name ?? null,
        // maplestory.io keeps the game's escaped line breaks
        description: item.description?.description?.replaceAll("\\n", "\n") ?? null,
        category: item.typeInfo?.category ?? null,
        subCategory: item.typeInfo?.subCategory ?? null,
        success: meta.success ?? null,
        iconOrigin: meta.iconOrigin ? [meta.iconOrigin.x, meta.iconOrigin.y] : null,
        ...Object.fromEntries(Object.entries(meta).filter(([key]) => !IMAGE_FIELDS.has(key))),
        iconPng: Buffer.from(icon, "base64"),
      };
    } catch (err) {
      failed.push(`${id} (${err.message})`);
      return null;
    } finally {
      if (++done % 50 === 0 || done === ids.length) console.log(`  ${done}/${ids.length}`);
    }
  });

  const saved = scrolls.filter(Boolean);

  // Save each distinct icon once. Scrolls are sorted by ID, so the first scroll
  // with a given icon is the lowest ID, which looks up its name. The key
  // includes the origin, so icons only count as the same if they also align
  // the same.
  const icons = new Map(); // key → icon name
  for (const scroll of saved) {
    const key = `${createHash("sha256").update(scroll.iconPng).digest("hex")}@${scroll.iconOrigin}`;
    if (!icons.has(key)) {
      const name = ICON_NAMES[scroll.id];
      if (!name) {
        throw new Error(
          `New icon first used by ${scroll.id} "${scroll.name}": add a name for it to ICON_NAMES`,
        );
      }
      icons.set(key, name);
      await writeFile(out(`public/scrolls/icons/${name}.png`), scroll.iconPng);
    }
    scroll.icon = icons.get(key);
    delete scroll.iconPng;
  }
  // A name the data no longer uses means the icons changed; rename by hand
  const unused = Object.values(ICON_NAMES).filter((n) => ![...icons.values()].includes(n));
  if (unused.length) console.log(`Unused icon names: ${unused.join(", ")}`);

  await writeFile(out("src/data/scrolls.json"), `${JSON.stringify(saved, null, 2)}\n`);
  return { listed: ids.length, saved: saved.length, icons: icons.size, failed };
}

// --- Effects: success and failure animations ---

const roundUpToEven = (n) => n + (n % 2);

async function fetchEffect(name, wzName) {
  const base = `${WZ}/Effect/BasicEff.img/Enchant/${wzName}`;
  const { children } = await getJson(base);
  const frameIds = children.filter((c) => /^\d+$/.test(c)).sort((a, b) => a - b);

  const frames = await mapLimit(frameIds, CONCURRENCY, async (f) => {
    const [frame, origin, delay] = await Promise.all([
      getJson(`${base}/${f}`),
      getJson(`${base}/${f}/origin`),
      // The game uses 100 ms when a frame has no delay
      getJson(`${base}/${f}/delay`).catch(() => ({ value: 100 })),
    ]);
    return {
      image: decodePng(Buffer.from(frame.value, "base64")),
      origin: [origin.value.x, origin.value.y],
      delay: delay.value,
    };
  });

  // One shared canvas: each frame's origin lands on the same anchor point, so
  // the frames don't drift while animating. Even numbers keep a 2× display
  // exact (the lesson from the cursor).
  const anchor = [0, 1].map((axis) => roundUpToEven(Math.max(...frames.map((f) => f.origin[axis]))));
  const canvas = [0, 1].map((axis) =>
    roundUpToEven(
      Math.max(
        ...frames.map((f) => anchor[axis] - f.origin[axis] + (axis ? f.image.height : f.image.width)),
      ),
    ),
  );

  const dir = out(`public/scrolls/effects/${name}/`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await Promise.all(
    frames.map((f, i) => {
      const offset = [anchor[0] - f.origin[0], anchor[1] - f.origin[1]];
      const file = new URL(`${String(i).padStart(2, "0")}.png`, dir);
      return writeFile(file, encodePng(pad(f.image, canvas, offset)));
    }),
  );
  return { frames: frames.length, delays: frames.map((f) => f.delay), canvas, anchor };
}

// --- Sounds ---

// MPEG audio frame size in bytes, or 0 if `buf[i..]` isn't a valid frame header
const BITRATES = {
  // kbps by bitrate index, for layer III
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };

function mp3FrameLength(buf, i) {
  if (i + 4 > buf.length || buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return 0;
  const version = { 0: 2.5, 2: 2, 3: 1 }[(buf[i + 1] >> 3) & 3];
  const layer = (buf[i + 1] >> 1) & 3; // 1 = layer III
  const bitrateIndex = buf[i + 2] >> 4;
  const rateIndex = (buf[i + 2] >> 2) & 3;
  if (!version || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return 0;
  const bitrate = BITRATES[version === 1 ? 1 : 2][bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][rateIndex];
  const padding = (buf[i + 2] >> 1) & 1;
  return Math.floor(((version === 1 ? 144 : 72) * bitrate) / sampleRate) + padding;
}

async function fetchSound(name, wzName) {
  const { value } = await getJson(`${WZ}/Sound/Game.img/${wzName}`);
  const data = Buffer.from(value, "base64");
  // WZ sounds start with a header (format GUIDs and a WAVEFORMATEX), then the
  // MP3. Find the first frame that's followed by another valid frame.
  for (let i = 0; i < data.length; i++) {
    const length = mp3FrameLength(data, i);
    if (length && mp3FrameLength(data, i + length)) {
      await mkdir(out("public/scrolls/sounds/"), { recursive: true });
      await writeFile(out(`public/scrolls/sounds/${name}.mp3`), data.subarray(i));
      return { header: i, bytes: data.length - i };
    }
  }
  throw new Error(`No MP3 data found in ${wzName}`);
}

// --- Run ---

const started = Date.now();
const [effects, sounds] = await Promise.all([
  Promise.all([fetchEffect("success", "Success"), fetchEffect("failure", "Failure")]).then(
    ([success, failure]) => ({ success, failure }),
  ),
  Promise.all([fetchSound("success", "EnchantSuccess"), fetchSound("failure", "EnchantFailure")]),
]);
await writeFile(out("src/data/scroll-effects.json"), `${JSON.stringify(effects, null, 2)}\n`);
console.log("Effects:");
console.table(
  Object.fromEntries(
    Object.entries(effects).map(([k, e]) => [
      k,
      { frames: e.frames, canvas: e.canvas.join("×"), anchor: e.anchor.join(","), ms: e.delays.reduce((a, b) => a + b, 0) },
    ]),
  ),
);
console.log("Sounds:");
console.table({ success: sounds[0], failure: sounds[1] });

const scrolls = await fetchScrolls();
console.log(`Scrolls: ${scrolls.saved} of ${scrolls.listed} saved, using ${scrolls.icons} distinct icons`);
if (scrolls.failed.length) console.log(`Failed:\n  ${scrolls.failed.join("\n  ")}`);
console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
