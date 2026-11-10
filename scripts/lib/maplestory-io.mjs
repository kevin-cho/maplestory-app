// Helpers for fetching game data from maplestory.io in the asset scripts.

const TIMEOUT_MS = 10_000;
const RETRIES = 2;

/**
 * Fetches JSON, with a timeout per attempt and a few retries for flaky
 * responses. A 404 isn't retried: the data just doesn't exist.
 */
export async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) throw Object.assign(new Error(`404 for ${url}`), { final: true });
      if (!res.ok) throw new Error(`${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (err.final || attempt >= RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

/**
 * Like Promise.all(items.map(fn)), but runs at most `limit` calls at once, so
 * big downloads stay polite to maplestory.io. Results keep the input order.
 */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
