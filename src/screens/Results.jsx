import { useEffect, useRef, useState } from 'react';
import { artwork } from '../game/library';
import { Share } from '../components/Icons';
import { useCountUp } from '../game/useCountUp';
import { MAX_SCORE, SONGS_PER_RUN, rankFor } from '../game/scoring';
import { recordRun } from '../game/storage';

const medal = (score) => (score >= 9000 ? '🟩' : score >= 6000 ? '🟨' : score > 0 ? '🟧' : '⬛');
const MODE_LABEL = { scrubber: 'Scrubber', bandle: 'Bandle', heardle: 'Classic' };

export default function Results({ results, total, poolLabel, mode, onAgain, onChange }) {
  const [copied, setCopied] = useState(false);
  const saved = useRef(false);

  // Guarded so a refresh on this screen can't double-count the run.
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    recordRun(results, total);
  }, [results, total]);

  const max = SONGS_PER_RUN * MAX_SCORE;
  const rank = rankFor(total);
  const shown = useCountUp(total, 1100);

  const shareText = [
    `🎵 Songless — ${poolLabel}`,
    `${total.toLocaleString()} / ${max.toLocaleString()} · ${rank}`,
    '',
    ...results.map(
      (r, i) =>
        `${i + 1}  ${r.solved ? `${r.seconds.toFixed(1)}s` : '—'}  ${medal(r.score)} ${r.score.toLocaleString()}`
    ),
  ].join('\n');

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* dismissed */ }
  };

  return (
    <section className="results">
      <p className="results-pool">{poolLabel} · {MODE_LABEL[mode] ?? 'Scrubber'}</p>
      <h2 className="results-rank">{rank}</h2>
      <p className="results-total">
        <strong>{shown.toLocaleString()}</strong>
        <span> / {max.toLocaleString()}</span>
      </p>

      <ol className="breakdown">
        {results.map((r, i) => (
          <li
            key={i}
            className={r.solved ? '' : 'missed'}
            style={{ animationDelay: `${0.35 + i * 0.09}s` }}
          >
            {artwork(r.song, 100)
              ? <img src={artwork(r.song, 100)} alt="" loading="lazy" />
              : <span className="artist-fallback small">{r.song.t[0]}</span>}
            <div className="breakdown-meta">
              <strong>{r.song.t}</strong>
              <em>{r.song.a}</em>
            </div>
            <div className="breakdown-score">
              <span>{r.solved ? `${r.seconds.toFixed(1)}s` : 'missed'}</span>
              <strong>{r.score.toLocaleString()}</strong>
            </div>
          </li>
        ))}
      </ol>

      <div className="results-actions">
        <button type="button" className="btn ghost" onClick={share}>
          <Share /> {copied ? 'Copied' : 'Share result'}
        </button>
        <button type="button" className="btn ghost" onClick={onChange}>Change artist</button>
        <button type="button" className="btn primary" onClick={onAgain}>Play again</button>
      </div>
    </section>
  );
}
