// Builds the song library from the iTunes Search API into public/data/.
// Resumable: raw per-artist responses are cached in scripts/.cache, so re-runs
// only fetch artists that are new. Add more with:  node scripts/build-library.mjs --artists "Name, Name"

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'scripts', '.cache');
const OUT = path.join(ROOT, 'public', 'data');

const UA = 'Mozilla/5.0 (Songless library builder)';
// iTunes throttles at roughly 20 requests/minute per IP. Requests are serialised
// through a single gate at ~18/min; going faster earns a wall of 403s and 429s.
const MIN_INTERVAL_MS = 3300;
const RATE_BACKOFF_MS = [45_000, 120_000, 240_000];
// Workers all funnel through the same rate gate, so this only overlaps waiting.
const CONCURRENCY = 3;

// Variant markers. Only ever tested against a title's SUFFIX -- the bracketed or
// post-dash tail -- never the base title, or "Live and Let Die" and "Live Forever"
// would be deleted as live recordings.
const VARIANT = /\b(live|remix|remixed|karaoke|instrumental|commentary|a ?cappella|sped ?up|slowed|reverb|demo|rehearsal|reprise|medley|mashup|radio edit|extended|club mix|dub|backing track|tribute|session|acoustic|edit|version|mix|remaster(ed)?|mono|stereo|take \d+|alternate)\b/i;

// Whole-title rejections, for tracks that are never a guessable song.
const NEVER = /^(intro|outro|interlude|skit|prelude|overture|ay-?oh|announcement)\b/i;

function isVariant(title) {
  const suffixes = [];
  for (const m of title.matchAll(/[([]([^)\]]*)[)\]]/g)) suffixes.push(m[1]);
  const dash = title.match(/\s[-–—]\s(.+)$/);
  if (dash) suffixes.push(dash[1]);
  // A "(feat. X)" tail is a credit, not a variant, so it must not count.
  return suffixes.some((s) => !/^\s*(feat|ft|with|prod)\b/i.test(s) && VARIANT.test(s));
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nameKey = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

// Title key used for dedup: drop bracketed suffixes and punctuation.
const titleKey = (s) =>
  s.toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s*-\s*(single|ep|bonus track|remaster(ed)?.*)$/i, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/).filter(Boolean).join(' ');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let gate = Promise.resolve();
// Serialise every request through one chain so concurrent callers can't burst.
function throttled(fn) {
  const run = gate.then(fn);
  gate = run.then(() => sleep(MIN_INTERVAL_MS), () => sleep(MIN_INTERVAL_MS));
  return run;
}

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await throttled(async () => {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.status === 429 || res.status === 403) {
          const e = new Error(`rate ${res.status}`);
          e.rateLimited = true;
          throw e;
        }
        if (!res.ok) throw new Error(`http ${res.status}`);
        const text = await res.text();
        return text.trim() ? JSON.parse(text) : null;
      });
    } catch (err) {
      if (i === tries - 1) throw err;
      // A rate-limit needs a real cool-off, not the usual short retry.
      await sleep(err.rateLimited ? RATE_BACKOFF_MS[Math.min(i, 2)] : 1200 * 2 ** i);
    }
  }
}

async function fetchArtist(name) {
  const q = encodeURIComponent(name);
  const found = await getJSON(
    `https://itunes.apple.com/search?term=${q}&entity=musicArtist&limit=5&country=US`
  );
  // Prefer an exact name match over Apple's own ranking -- results[0] for
  // "Mayday" is the unrelated "¡MAYDAY!". Falling back to results[0] keeps
  // artists whose canonical name is in another script (Jay Chou -> 周杰倫).
  const target = nameKey(name);
  const hits = found?.results ?? [];
  const artist = hits.find((r) => nameKey(r.artistName) === target) ?? hits[0];
  if (!artist) return null;

  const songs = await getJSON(
    `https://itunes.apple.com/lookup?id=${artist.artistId}&entity=song&limit=200&country=US`
  );
  return { artist, results: songs?.results ?? [] };
}

// Keep a track if the artist is the primary credit OR is named in the artist
// credit field. Drop tracks where they only appear as a "(feat. X)" in the
// title -- those are someone else's songs.
function compileArtist(raw) {
  const { artist, results } = raw;
  const aid = artist.artistId;
  const akey = nameKey(artist.artistName);
  const byTitle = new Map();

  for (const r of results) {
    if (r.wrapperType !== 'track' || r.kind !== 'song' || !r.previewUrl) continue;
    const credited = r.artistId === aid || nameKey(r.artistName || '').includes(akey);
    if (!credited) continue;

    if (isVariant(r.trackName) || NEVER.test(r.trackName)) continue;

    const key = titleKey(r.trackName);
    if (!key) continue;

    const prev = byTitle.get(key);
    // Prefer the earliest release, then the shortest (least-decorated) title.
    const better =
      !prev ||
      (r.releaseDate || '9999') < (prev.releaseDate || '9999') ||
      ((r.releaseDate || '9999') === (prev.releaseDate || '9999') &&
        r.trackName.length < prev.trackName.length);
    if (better) byTitle.set(key, r);
  }

  // Tracks where this artist is the primary credit rank above ones they are only
  // co-credited on. Without this an obscure collaboration can land as an artist's
  // "top" song -- Seedhe Maut's first entry was a Bhojpuri feature -- which then
  // feeds the mixed-mode hit pool and the difficulty tiers. sort() is stable, so
  // Apple's own ordering survives inside each group.
  const songs = [...byTitle.values()]
    .sort((a, b) => Number(b.artistId === aid) - Number(a.artistId === aid))
    .map((r, idx) => ({
      i: r.trackId,
      t: r.trackName,
      a: r.artistName,
      y: Number((r.releaseDate || '').slice(0, 4)) || null,
      g: r.primaryGenreName || null,
      p: r.previewUrl,
      k: (r.artworkUrl100 || '').replace('100x100bb.jpg', '{sz}x{sz}bb.jpg') || null,
      d: idx < 15 ? 1 : idx < 40 ? 2 : idx < 80 ? 3 : 4, // difficulty from catalog position
    }));

  return {
    id: aid,
    name: artist.artistName,
    genre: artist.primaryGenreName || null,
    url: artist.artistLinkUrl || null,
    songs,
  };
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  await mkdir(path.join(OUT, 'artists'), { recursive: true });

  const seed = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'artists.seed.json'), 'utf8'));

  const argIdx = process.argv.indexOf('--artists');
  const extra =
    argIdx > -1 && process.argv[argIdx + 1]
      ? process.argv[argIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  // name -> region/category label
  const wanted = new Map();
  for (const [region, names] of Object.entries(seed)) {
    for (const n of names) if (!wanted.has(n)) wanted.set(n, region);
  }
  for (const n of extra) if (!wanted.has(n)) wanted.set(n, 'Added');

  const names = [...wanted.keys()];
  console.log(`${names.length} artists in seed list.`);

  // Recompile the shipped JSON from the cache without touching the network.
  // Filter and difficulty tuning is a two-second loop this way, not a 20-minute one.
  const noFetch = process.argv.includes('--no-fetch');
  if (noFetch) console.log('--no-fetch: compiling from cache only.');

  let fetched = 0, cached = 0, failed = [];
  let cursor = 0;

  async function worker() {
    while (cursor < names.length) {
      const name = names[cursor++];
      const file = path.join(CACHE, `${slug(name)}.json`);
      if (existsSync(file)) { cached++; continue; }
      try {
        const raw = await fetchArtist(name);
        if (!raw) { failed.push(name); continue; }
        await writeFile(file, JSON.stringify({ seedName: name, ...raw }));
        fetched++;
        if (fetched % 20 === 0) console.log(`  fetched ${fetched}...`);
      } catch (err) {
        failed.push(`${name} (${err.message})`);
      }
    }
  }

  const t0 = Date.now();
  if (!noFetch) {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(
      `Fetched ${fetched}, reused ${cached} cached, ${failed.length} failed ` +
      `in ${((Date.now() - t0) / 1000).toFixed(0)}s`
    );
    if (failed.length) console.log(`  ${failed.length} failed (re-run to retry): ${failed.slice(0, 12).join(', ')}${failed.length > 12 ? '…' : ''}`);
  }

  // ---- compile everything in the cache into the shipped data files ----
  const index = [];
  const hits = [];
  const seenArtistIds = new Set();

  for (const f of await readdir(CACHE)) {
    if (!f.endsWith('.json')) continue;
    const raw = JSON.parse(await readFile(path.join(CACHE, f), 'utf8'));
    const a = compileArtist(raw);
    if (a.songs.length < 8) continue;              // too thin to fill a run
    if (seenArtistIds.has(a.id)) continue;         // two seed names resolved to one artist
    seenArtistIds.add(a.id);

    const region = wanted.get(raw.seedName) || 'Added';
    await writeFile(path.join(OUT, 'artists', `${a.id}.json`), JSON.stringify(a.songs));

    index.push({
      id: a.id,
      n: a.name,
      g: a.genre,
      r: region,
      c: a.songs.length,
      k: a.songs.find((s) => s.k)?.k || null,
    });
    hits.push(...a.songs.slice(0, 12));
  }

  index.sort((x, y) => x.n.localeCompare(y.n));
  await writeFile(path.join(OUT, 'artists.json'), JSON.stringify(index));
  await writeFile(path.join(OUT, 'hits.json'), JSON.stringify(hits));

  const totalSongs = index.reduce((n, a) => n + a.c, 0);
  console.log(
    `\nBuilt ${index.length} artists / ${totalSongs.toLocaleString()} songs.\n` +
    `  artists.json  ${(JSON.stringify(index).length / 1024).toFixed(0)}KB\n` +
    `  hits.json     ${(JSON.stringify(hits).length / 1024).toFixed(0)}KB (${hits.length} songs)`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
