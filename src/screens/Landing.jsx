import { useEffect, useMemo, useState } from 'react';
import { Arrow, Globe, Play } from '../components/Icons';
import { loadArtists } from '../game/library';
import { CLIP_LENGTH, HEARDLE_STEPS, LAYER_POINTS, scrubberScore } from '../game/scoring';

// Deterministic so the hero waveform is identical on every load.
function bars(count, seed = 7) {
  let x = seed;
  const rand = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  return Array.from({ length: count }, (_, i) => {
    const envelope = 0.35 + 0.65 * Math.sin((i / count) * Math.PI * 2.1) ** 2;
    return 0.16 + rand() * 0.84 * envelope;
  });
}

function ScoreCurve() {
  // Drawn straight from the real scoring function, not an approximation.
  const { line, area } = useMemo(() => {
    // Warp x the same way the scrubber does, then rebase so t=0.1s sits at x=0 --
    // otherwise the area fill ramps up from the origin and reads like a rise.
    const x0 = Math.pow(0.1 / CLIP_LENGTH, 0.42);
    const pts = Array.from({ length: 121 }, (_, i) => {
      const t = 0.1 + (i / 120) * (CLIP_LENGTH - 0.1);
      const x = (((Math.pow(t / CLIP_LENGTH, 0.42) - x0) / (1 - x0)) * 100).toFixed(2);
      const y = (100 - ((scrubberScore(t) - 3000) / 7200) * 100).toFixed(2);
      return `${x},${y}`;
    });
    return { line: `M${pts.join('L')}`, area: `M${pts.join('L')}L100,100L0,100Z` };
  }, []);

  return (
    <figure className="curve">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#curveFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.1"
              vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="curve-hi">10,000</span>
      <span className="curve-lo">3,500</span>
      <figcaption>
        <span>0.1s</span><span>1s</span><span>5s</span><span>30s</span>
      </figcaption>
    </figure>
  );
}

function Marquee() {
  const [art, setArt] = useState([]);
  const [count, setCount] = useState(null);

  useEffect(() => {
    loadArtists()
      .then((list) => {
        setCount(list.length);
        setArt(list.filter((a) => a.k).sort(() => Math.random() - 0.5).slice(0, 28));
      })
      .catch(() => {});
  }, []);

  if (!art.length) return null;
  const strip = [...art, ...art]; // duplicated so the loop is seamless

  return (
    <div className="marquee-wrap">
      <div className="marquee" aria-hidden="true">
        {strip.map((a, i) => (
          <img key={i} src={a.k.replace(/\{sz\}/g, 100)} alt="" loading="lazy" />
        ))}
      </div>
      {count && <p className="marquee-note">{count} artists, from Arijit Singh to Zach Bryan</p>}
    </div>
  );
}

export default function Landing({ onStart, mode, setMode, stats }) {
  const wave = useMemo(() => bars(150), []);

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">A music guessing game</p>
        <h1>
          You get <span className="hl">0.1 seconds</span>.<br />
          <em>Name that song.</em>
        </h1>
        <p className="hero-sub">
          One drum hit. One vowel. That is the whole clue. Buy more of the clip if you
          have to, or bring the band in one instrument at a time — but everything you
          unlock costs you points.
        </p>

        <div className="hero-cta">
          <button type="button" className="btn primary lg" onClick={onStart}>
            <Play size={17} /> Start playing
          </button>
          <span className="hero-meta">Free · No account · 28,000 songs</span>
        </div>

        <figure className="wave-demo">
          <div className="wave">
            {wave.map((h, i) => (
              <i key={i} className={i === 0 ? 'lit' : ''} style={{ height: `${h * 100}%` }} />
            ))}
            <span className="wave-marker" />
          </div>
          <figcaption>
            <span className="wave-tag">that sliver is 0.1s</span>
            <span className="wave-len">30 second clip</span>
          </figcaption>
        </figure>
      </section>

      <Marquee />

      <section className="how">
        <h2 className="section-title">How a round works</h2>
        <ol className="steps-list">
          <li>
            <span className="num">01</span>
            <h3>Press play</h3>
            <p>You hear the first tenth of a second. Usually that is a single transient — a snare, a downbeat, the attack of a synth.</p>
          </li>
          <li>
            <span className="num">02</span>
            <h3>Buy more, if you must</h3>
            <p>Drag the playhead right to unlock more audio — or in Bandle, call in the next instrument. Either way you can never take it back.</p>
          </li>
          <li>
            <span className="num">03</span>
            <h3>Guess without fear</h3>
            <p>A wrong answer costs 500 points but never ends the round. Five songs per run, 50,000 points on the table.</p>
          </li>
        </ol>
      </section>

      <section className="scoring">
        <div>
          <h2 className="section-title">The longer you listen, the less it is worth</h2>
          <p className="section-body">
            Scoring follows a decay curve that falls hardest at the very start, because
            the first second carries almost all of the information. Nail it instantly and
            you bank the full 10,000. Sit through the whole clip and it is still worth
            3,500 — you are never playing for nothing.
          </p>
          <dl className="figures">
            <div><dt>0.1s</dt><dd>{scrubberScore(0.1).toLocaleString()}</dd></div>
            <div><dt>1s</dt><dd>{scrubberScore(1).toLocaleString()}</dd></div>
            <div><dt>5s</dt><dd>{scrubberScore(5).toLocaleString()}</dd></div>
            <div><dt>30s</dt><dd>{scrubberScore(30).toLocaleString()}</dd></div>
          </dl>
        </div>
        <ScoreCurve />
      </section>

      <section className="modes">
        <h2 className="section-title">Three ways to play</h2>
        <div className="mode-cards">
          {[
            {
              key: 'scrubber', badge: 'Default', title: 'Scrubber',
              body: 'You control exactly how much you hear. Drag for more, pay in points. Wrong guesses never end the round.',
            },
            {
              key: 'bandle', badge: 'Band', title: 'One instrument at a time',
              body: `Start on the drums alone, worth the full ${LAYER_POINTS[0].toLocaleString()}. Add bass, chords, melody, then vocals — each one drops the ceiling, down to ${LAYER_POINTS[4].toLocaleString()}.`,
            },
            {
              key: 'heardle', badge: 'Classic', title: 'Six steps',
              body: `The original formula: ${HEARDLE_STEPS.join('s, ')}s. Every miss or skip unlocks the next step automatically.`,
            },
          ].map((m) => (
            <button
              key={m.key}
              type="button"
              className={`mode-card ${mode === m.key ? 'is-on' : ''}`}
              onClick={() => setMode(m.key)}
            >
              <span className="mode-badge">{m.badge}</span>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
              <span className="mode-pick">{mode === m.key ? 'Selected' : 'Choose'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="closer">
        <Globe size={26} />
        <h2>Pick any artist on earth</h2>
        <p>
          Search the whole library and play a run drawn only from one artist&apos;s catalogue —
          Taylor Swift, BTS, Arijit Singh, Burna Boy, Bad Bunny, Queen — or take the mixed
          pool and let it throw anything at you.
        </p>
        <button type="button" className="btn primary lg" onClick={onStart}>
          Choose an artist <Arrow size={17} />
        </button>
        {stats?.runs > 0 && (
          <p className="closer-stats">
            You have played {stats.runs} run{stats.runs === 1 ? '' : 's'} ·
            best {stats.best.toLocaleString()} ·
            {' '}{Math.round((stats.solved / Math.max(1, stats.songs)) * 100)}% solved
          </p>
        )}
      </section>
    </div>
  );
}
