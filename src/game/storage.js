// Safari private mode throws on setItem, so every access is guarded and a
// failure just means stats don't persist -- never a crash.
const KEY = 'songless:v1:stats';

const blank = { runs: 0, best: 0, totalScore: 0, solved: 0, songs: 0 };

export function readStats() {
  try {
    return { ...blank, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...blank };
  }
}

export function recordRun(results, total) {
  try {
    const s = readStats();
    const next = {
      runs: s.runs + 1,
      best: Math.max(s.best, total),
      totalScore: s.totalScore + total,
      solved: s.solved + results.filter((r) => r.solved).length,
      songs: s.songs + results.length,
    };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return readStats();
  }
}
