import { useCallback, useEffect, useRef, useState } from 'react';
import { CLIP_LENGTH, START_SECONDS, scrubberScore } from '../game/scoring';

// The first second decides most rounds, so give it far more of the track than a
// linear scale would. This curve spends ~22% of the width on the first second.
const CURVE = 0.45;
const posFromTime = (t) => Math.pow(Math.min(t, CLIP_LENGTH) / CLIP_LENGTH, CURVE);
const timeFromPos = (p) => CLIP_LENGTH * Math.pow(Math.min(Math.max(p, 0), 1), 1 / CURVE);

const TICKS = [0.1, 0.5, 1, 2, 5, 10, 16, 30];

// `scoreAt` lets the caller supply mode-correct scoring -- in Bandle the current
// instrument layer caps what the clip can be worth, so the plain scrubber curve
// would quote a number the player can no longer reach.
export default function Scrubber({ unlocked, onBuy, onCommit, disabled, scoreAt = scrubberScore }) {
  const trackRef = useRef(null);
  const [hover, setHover] = useState(null); // seconds under the pointer while dragging
  const dragging = useRef(false);

  const secondsAt = useCallback((clientX) => {
    const el = trackRef.current;
    if (!el) return unlocked;
    const { left, width } = el.getBoundingClientRect();
    return timeFromPos((clientX - left) / width);
  }, [unlocked]);

  const move = useCallback((e) => {
    if (!dragging.current) return;
    setHover(Math.max(unlocked, secondsAt(e.clientX)));
  }, [secondsAt, unlocked]);

  const end = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setHover((h) => {
      if (h != null && h > unlocked) { onBuy(h); onCommit?.(h); }
      return null;
    });
  }, [unlocked, onBuy, onCommit]);

  useEffect(() => {
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [move, end]);

  const start = (e) => {
    if (disabled) return;
    dragging.current = true;
    setHover(Math.max(unlocked, secondsAt(e.clientX)));
  };

  const target = hover ?? unlocked;
  const unlockedPct = posFromTime(unlocked) * 100;
  const targetPct = posFromTime(target) * 100;
  const buying = hover != null && hover > unlocked + 0.001;

  const nudge = (delta) => {
    const next = Math.min(CLIP_LENGTH, unlocked + delta);
    onBuy(next);
    onCommit?.(next);
  };

  return (
    <div className="scrubber">
      <div className="scrubber-head">
        <span className="scrubber-time">
          {target < 1 ? target.toFixed(1) : target.toFixed(target < 10 ? 1 : 0)}s
        </span>
        <span className={`scrubber-worth ${buying ? 'falling' : ''}`}>
          worth {scoreAt(target).toLocaleString()}
        </span>
      </div>

      <div
        ref={trackRef}
        className={`scrubber-track ${disabled ? 'is-disabled' : ''}`}
        onPointerDown={start}
        role="slider"
        aria-label="Unlock more of the clip"
        aria-valuemin={START_SECONDS}
        aria-valuemax={CLIP_LENGTH}
        aria-valuenow={Number(unlocked.toFixed(1))}
        aria-valuetext={`${unlocked.toFixed(1)} seconds unlocked`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); nudge(e.shiftKey ? 1 : 0.1); }
          if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
        }}
      >
        <div className="scrubber-owned" style={{ width: `${unlockedPct}%` }} />
        {buying && (
          <div
            className="scrubber-buying"
            style={{ left: `${unlockedPct}%`, width: `${Math.max(0, targetPct - unlockedPct)}%` }}
          />
        )}
        <div className="scrubber-handle" style={{ left: `${targetPct}%` }} />
      </div>

      {/* Outside the track: it clips its fill layers, which would eat these too. */}
      <div className="scrubber-ticks" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} className="scrubber-tick" style={{ left: `${posFromTime(t) * 100}%` }}>
            <i />
            <em>{t}s</em>
          </span>
        ))}
      </div>

      <div className="scrubber-actions">
        <button type="button" onClick={() => nudge(0.1)} disabled={disabled}>+0.1s</button>
        <button type="button" onClick={() => nudge(0.5)} disabled={disabled}>+0.5s</button>
        <button type="button" onClick={() => nudge(2)} disabled={disabled}>+2s</button>
        <button type="button" onClick={() => nudge(CLIP_LENGTH)} disabled={disabled}>
          Hear it all
        </button>
      </div>
      <p className="scrubber-hint">
        Drag right to buy more of the clip. You can&apos;t buy it back.
      </p>
    </div>
  );
}
