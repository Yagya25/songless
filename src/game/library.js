const BASE = `${import.meta.env.BASE_URL}data`;

const cache = new Map();

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
    return r.json();
  });
  cache.set(url, p);
  return p;
}

export const loadArtists = () => getJSON(`${BASE}/artists.json`);
export const loadHits = () => getJSON(`${BASE}/hits.json`);
export const loadArtistSongs = (id) => getJSON(`${BASE}/artists/${id}.json`);

export function artwork(song, size = 300) {
  return song?.k ? song.k.replace(/\{sz\}/g, size) : null;
}

export function pickRound(pool, count) {
  const seen = new Set();
  const unique = pool.filter((s) => {
    const key = `${s.t}|${s.a}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const picked = [];
  const taken = new Set();
  const limit = Math.min(count, unique.length);
  while (picked.length < limit) {
    const idx = Math.floor(Math.random() * unique.length);
    if (taken.has(idx)) continue;
    taken.add(idx);
    picked.push(unique[idx]);
  }
  return picked;
}

export function searchArtists(query, artists, limit = 40) {
  const q = query.trim().toLowerCase();
  if (!q) return artists.slice(0, limit);
  const scored = [];
  for (const a of artists) {
    const n = a.n.toLowerCase();
    let score = -1;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (n.includes(q)) score = 3;
    else if ((a.g || '').toLowerCase().includes(q)) score = 4;
    else if ((a.r || '').toLowerCase().includes(q)) score = 5;
    if (score >= 0) scored.push({ a, score });
  }
  scored.sort((x, y) => x.score - y.score || y.a.c - x.a.c);
  return scored.slice(0, limit).map((s) => s.a);
}
