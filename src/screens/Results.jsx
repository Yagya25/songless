import { useEffect, useRef, useState } from 'react';
import { artwork } from '../game/library';
import { Share } from '../components/Icons';
import { useCountUp } from '../game/useCountUp';
import { MAX_SCORE, SONGS_PER_RUN, rankFor } from '../game/scoring';
import { recordRun } from '../game/storage';
import { shareResult } from '../game/shareImage';

const MODE_LABEL = { scrubber: 'Scrubber', bandle: 'Bandle', heardle: 'Classic' };

const SHARE_LABEL = {
  idle: 'Share result',
  working: 'Building image…',
  shared: 'Shared',
  downloaded: 'Image saved',
  copied: 'Copied',
  cancelled: 'Share result',
  failed: 'Could not share',
};

export default function Results({ results, total, poolLabel, mode, songCount = SONGS_PER_RUN, onAgain, onChange }) {
  const [shareState, setShareState] = useState('idle');
  const saved = useRef(false);

  // Guarded so a refresh on this screen can't double-count the run.
  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    recordRun(results, total);
  }, [results, total]);

  const max = songCount * MAX_SCORE;
  const rank = rankFor(total, songCount);
  const shown = useCountUp(total, 1100);

  const share = async () => {
    setShareState('working');
    const outcome = await shareResult({ results, total, poolLabel, mode });
    setShareState(outcome);
    if (outcome !== 'failed') setTimeout(() => setShareState('idle'), 2600);
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
        <button
          type="button"
          className="btn ghost"
          onClick={share}
          disabled={shareState === 'working'}
        >
          <Share /> {SHARE_LABEL[shareState]}
        </button>
        <button type="button" className="btn ghost" onClick={onChange}>Change artists</button>
        <button type="button" className="btn primary" onClick={onAgain}>Play again</button>
      </div>
    </section>
  );
}
