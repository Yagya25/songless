import { useEffect } from 'react';
import Scrubber from '../components/Scrubber';
import LayerStack from '../components/LayerStack';
import GuessInput from '../components/GuessInput';
import { LAYERS } from '../audio/layers';
import { Back, Cross, Pause, Play as PlayIcon, Skip } from '../components/Icons';
import { useGame } from '../game/useGame';
import { artwork } from '../game/library';
import { HEARDLE_STEPS, SONGS_PER_RUN, bandleScore, scrubberScore } from '../game/scoring';

export default function Play({ mode, pool, poolLabel, onExit, onDone }) {
  const g = useGame({ mode, pool, poolLabel });
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

  return (
    <section className="play">
      <header className="play-head">
        <button type="button" className="btn-icon" onClick={onExit} aria-label="Exit run">
          <Back />
        </button>
        <div className="play-meta">
          <span className="pill">{poolLabel}</span>
          <span className="muted">Song {g.round + 1} of {SONGS_PER_RUN}</span>
        </div>
        <div className="play-score">
          <strong>{g.total.toLocaleString()}</strong>
          <em>total</em>
        </div>
      </header>

      <div className="dots" aria-hidden="true">
        {Array.from({ length: SONGS_PER_RUN }, (_, i) => (
          <span key={i} className={i < g.results.length ? 'done' : i === g.round ? 'now' : ''} />
        ))}
      </div>

      {revealed ? (
        <div className={`reveal ${last?.solved ? 'won' : 'lost'}`}>
          {artwork(g.song) && <img src={artwork(g.song)} alt="" className="cover" />}
          <p className="reveal-verdict">
            {last?.solved
              ? `Got it in ${last.seconds.toFixed(1)}s${isBandle ? ` on ${LAYERS[last.layer].name.toLowerCase()}` : ''}`
              : 'Not this time'}
          </p>
          <h2>{g.song.t}</h2>
          <p className="muted">{g.song.a}{g.song.y ? ` · ${g.song.y}` : ''}</p>
          <p className="reveal-score">+{last?.score.toLocaleString() ?? 0}</p>
          <div className="reveal-actions">
            <button type="button" className="btn ghost" onClick={() => g.play(30)}>
              <PlayIcon size={16} /> Hear the full clip
            </button>
            <button type="button" className="btn primary" onClick={g.next}>
              {g.round + 1 >= SONGS_PER_RUN ? 'See results' : 'Next song'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="stage">
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
