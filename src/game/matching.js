// Fold accents, drop bracketed suffixes and punctuation so "Tití Me Preguntó",
// "Bad Guy" and "Don't Stop Me Now (Remastered)" all compare sensibly.
export function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s*-\s*(single|ep|bonus track|remaster(ed)?.*)$/i, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

// `picked` is the dropdown entry the player chose, when they chose one. It is
// authoritative: plenty of titles in this catalog are in Hangul, Kana or
// Devanagari and simply cannot be typed on a Latin keyboard, so selecting from
// the list has to be a first-class way to answer.
export function isCorrect(guess, song, picked) {
  if (picked) return picked.i === song.i || normalize(picked.t) === normalize(song.t);
  const g = normalize(guess);
  return Boolean(g) && g === normalize(song.t);
}

// Ranked suggestions: exact prefix beats word-start beats loose substring.
export function suggest(query, songs, limit = 8) {
  const q = normalize(query);
  if (q.length < 1) return [];

  const raw = query.trim().toLowerCase();
  const scored = [];
  for (const song of songs) {
    // Titles in Hangul/Kana/Devanagari normalize to an empty string, so fall
    // back to the raw title or they'd never surface in the dropdown at all.
    const title = normalize(song.t) || song.t.toLowerCase();
    const needle = normalize(song.t) ? q : raw;
    let score = -1;

    if (title === needle) score = 0;
    else if (title.startsWith(needle)) score = 1;
    else if (title.split(/\s+/).some((w) => w.startsWith(needle))) score = 2;
    else if (title.includes(needle)) score = 3;
    else if (normalize(song.a).startsWith(q)) score = 4;

    if (score >= 0) scored.push({ song, score, len: title.length });
  }

  scored.sort((a, b) => a.score - b.score || a.len - b.len);

  // One entry per distinct title, so duplicate re-releases don't crowd the list.
  const seen = new Set();
  const out = [];
  for (const { song } of scored) {
    const key = `${normalize(song.t)}|${normalize(song.a)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(song);
    if (out.length >= limit) break;
  }
  return out;
}
