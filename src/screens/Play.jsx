import { useEffect } from 'react';
import Scrubber from '../components/Scrubber';
import LayerStack from '../components/LayerStack';
import GuessInput from '../components/GuessInput';
import Reveal from '../components/Reveal';
import { LAYERS } from '../audio/layers';
import { Back, Cross, Pause, Play as PlayIcon, Skip } from '../components/Icons';
import { useGame } from '../game/useGame';
import { HEARDLE_STEPS, bandleScore, scrubberScore } from '../game/scoring';

export default function Play({ mode, pool, poolLabel, songCount, onExit, onDone }) {
  const g = useGame({ mode, pool, poolLabel, songCount });
  const isHeardle = mode === 'heardle';
  const isBandle = mode === 'bandle';

  useEffect(() => {
    if (g.phase === 'done') onDone(g.results, g.total);
  }, [g.phase, g.results, g.total, onDone]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (g.playing) g.stop();
        else g.play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g]);

  if (!g.song) return <p className="loading">No songs in this pool.</p>;

  const revealed = g.phase === 'revealed';
  const last = g.results[g.results.length - 1];
  // Counted from this round's guesses, which reset each round -- so keying the
  // stage on it replays the shake per miss without shaking on a fresh round.
  const misses = g.guesses.filter((x) => !x.correct && !x.skipped).length;

  return (
    <section className="play">
      <header className="play-head">
        <button type="button" className="btn-icon" onClick={onExit} aria-label="Exit run">
          <Back />
        </button>
        <div className="play-meta">
          <span className="pill">{poolLabel}</span>
          <span className="muted">Song {g.round + 1} of {songCount}</span>
        </div>
        <div className="play-score">
          <strong>{g.total.toLocaleString()}</strong>
          <em>total</em>
        </div>
      </header>

      <div className="dots" aria-hidden="true">
        {Array.from({ length: songCount }, (_, i) => (
          <span key={i} className={i < g.results.length ? 'done' : i === g.round ? 'now' : ''} />
        ))}
      </div>

      {revealed ? (
        <Reveal
          key={g.round}
          song={g.song}
          result={last}
          isBandle={isBandle}
          isLastRound={g.round + 1 >= songCount}
          onReplay={() => g.play(30, LAYERS.length - 1)}
          onNext={g.next}
        />
      ) : (
        <>
          <div className={`stage ${misses > 0 ? 'shook' : ''}`} key={`stage-${misses}`}>
            <button
              type="button"
              className={`play-btn ${g.playing ? 'is-playing' : ''}`}
              onClick={() => (g.playing ? g.stop() : g.play())}
              aria-label={g.playing ? 'Stop' : 'Play the clip'}
            >
              {g.playing ? <Pause size={26} /> : <PlayIcon size={28} />}
            </button>
            <div className="stage-info">
              <span className="stage-secs">
                {isHeardle
                  ? `${HEARDLE_STEPS[Math.min(g.stepIndex, 5)]}.0s`
                  : `${g.unlocked.toFixed(1)}s`}
              </span>
              <span className="stage-worth">
                {isBandle && <b className="stage-layer">{LAYERS[g.layer].name}</b>}{' '}
                worth {g.potential.toLocaleString()} points
              </span>
            </div>
          </div>

          {isHeardle && (
            <div className="steps">
              {HEARDLE_STEPS.map((s, i) => (
                <span key={s} className={i <= g.stepIndex ? 'on' : ''}>{s}s</span>
              ))}
            </div>
          )}

          {!isHeardle && (
            <Scrubber
              unlocked={g.unlocked}
              onBuy={g.buyTo}
              onCommit={(secs) => g.play(secs)}
              disabled={revealed}
              scoreAt={isBandle ? (s) => bandleScore(g.layer, s) : scrubberScore}
            />
          )}

          {isBandle && (
            <LayerStack
              layer={g.layer}
              onAdd={g.addLayer}
              onPlayLayer={(i) => g.play(undefined, i)}
              disabled={revealed}
            />
          )}

          <GuessInput
            songs={pool}
            onGuess={g.guess}
            onSkip={g.skip}
            showSkip={isHeardle}
            disabled={revealed}
          />

          {g.guesses.length > 0 && (
            <ul className="guesses">
              {g.guesses.map((x, i) => (
                <li key={i} className={x.skipped ? 'skipped' : 'wrong'}>
                  {x.skipped ? <Skip /> : <Cross />}
                  <b>{x.skipped ? 'Skipped' : x.text}</b>
                  <span>{isHeardle ? 'more audio' : '−500'}</span>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="btn quiet" onClick={g.giveUp}>
            Give up on this one
          </button>
        </>
      )}
    </section>
  );
}
