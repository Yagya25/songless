import { useCallback, useState } from 'react';
import Landing from './screens/Landing';
import ArtistPicker from './screens/ArtistPicker';
import Play from './screens/Play';
import Results from './screens/Results';
import { Logo } from './components/Icons';
import { loadArtistSongs, loadHits } from './game/library';
import { audio } from './audio/engine';
import { readStats } from './game/storage';
import { SONGS_PER_RUN } from './game/scoring';
import './styles.css';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState('scrubber');
  const [pool, setPool] = useState(null);
  const [poolLabel, setPoolLabel] = useState('');
  const [run, setRun] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(readStats);

  const goHome = () => { setStats(readStats()); setScreen('home'); };

  // The AudioContext has to be created inside a real user gesture or every
  // later resume() is a fight with the autoplay policy.
  const start = () => { audio.unlock(); setScreen('picker'); };

  const begin = useCallback(async (loader, label) => {
    setBusy(true);
    setError(null);
    try {
      const songs = await loader();
      if (songs.length < SONGS_PER_RUN) throw new Error('Not enough songs in this pool.');
      setPool(songs);
      setPoolLabel(label);
      setRun((n) => n + 1);
      setScreen('play');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDone = useCallback((results, total) => {
    setOutcome({ results, total });
    setScreen('results');
  }, []);

  const again = () => { setRun((n) => n + 1); setOutcome(null); setScreen('play'); };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={goHome}>
          <Logo size={24} /> Songless
        </button>
        <div className="topbar-right">
          <div className="mode-toggle" role="group" aria-label="Game mode">
            {[
              ['scrubber', 'Scrubber'],
              ['bandle', 'Bandle'],
              ['heardle', 'Classic'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                className={mode === key ? 'is-on' : ''}
                onClick={() => setMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {busy && <p className="loading">Loading songs…</p>}

      <main>
        {screen === 'home' && (
          <Landing onStart={start} mode={mode} setMode={setMode} stats={stats} />
        )}

        {screen === 'picker' && (
          <ArtistPicker
            onBack={goHome}
            onPickMix={() => begin(loadHits, 'Mix — every artist')}
            onPickArtist={(a) => begin(() => loadArtistSongs(a.id), a.n)}
          />
        )}

        {screen === 'play' && pool && (
          <Play
            key={`${poolLabel}-${mode}-${run}`}
            mode={mode}
            pool={pool}
            poolLabel={poolLabel}
            onExit={() => setScreen('picker')}
            onDone={onDone}
          />
        )}

        {screen === 'results' && outcome && (
          <Results
            key={run}
            results={outcome.results}
            total={outcome.total}
            poolLabel={poolLabel}
            mode={mode}
            onAgain={again}
            onChange={() => setScreen('picker')}
          />
        )}
      </main>

      <footer className="foot">
        <span>Song previews provided by Apple.</span>
        <span>A tribute to Songless and Heardle.</span>
      </footer>
    </div>
  );
}
