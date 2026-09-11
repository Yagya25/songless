import { useEffect, useMemo, useState } from 'react';
import { loadArtists, searchArtists } from '../game/library';
import { Arrow, Back, Check, Cross, Globe, Search } from '../components/Icons';

export const MAX_ARTISTS = 10;

export default function ArtistPicker({ onPlay, onPickMix, onBack, tier, setTier }) {
  const [artists, setArtists] = useState(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadArtists().then(setArtists).catch((e) => setError(e.message));
  }, []);

  const regions = useMemo(() => {
    if (!artists) return [];
    return ['All', ...[...new Set(artists.map((a) => a.r))].sort()];
  }, [artists]);

  const shown = useMemo(() => {
    if (!artists) return [];
    const scope = region === 'All' ? artists : artists.filter((a) => a.r === region);
    return searchArtists(query, scope, 120);
  }, [artists, query, region]);

  const pickedIds = useMemo(() => new Set(picked.map((a) => a.id)), [picked]);
  const full = picked.length >= MAX_ARTISTS;

  const toggle = (a) => {
    setPicked((prev) =>
      prev.some((p) => p.id === a.id)
        ? prev.filter((p) => p.id !== a.id)
        : prev.length >= MAX_ARTISTS ? prev : [...prev, a]
    );
  };

  if (error) return <p className="error">Couldn&apos;t load the song library: {error}</p>;
  if (!artists) return <p className="loading">Loading artists…</p>;

  const totalSongs = artists.reduce((n, a) => n + a.c, 0);

  return (
    <section className="picker">
      <header className="picker-head">
        <button type="button" className="btn-icon" onClick={onBack} aria-label="Back">
          <Back />
        </button>
        <div>
          <h2>Pick your pool</h2>
          <p>{artists.length} artists · {totalSongs.toLocaleString()} songs</p>
        </div>
      </header>

      <div className="tier" role="radiogroup" aria-label="Song pool">
        <button
          type="button"
          role="radio"
          aria-checked={tier === 'top'}
          className={`tier-opt ${tier === 'top' ? 'is-on' : ''}`}
          onClick={() => setTier('top')}
        >
          <strong>Top songs</strong>
          <em>The hits everyone knows</em>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={tier === 'deep'}
          className={`tier-opt ${tier === 'deep' ? 'is-on' : ''}`}
          onClick={() => setTier('deep')}
        >
          <strong>Deep cuts</strong>
          <em>Past the singles. Much harder.</em>
        </button>
      </div>

      <button type="button" className="mix-card" onClick={() => onPickMix(tier)}>
        <Globe size={24} />
        <span>
          <strong>Mix — every artist</strong>
          <em>
            {tier === 'deep'
              ? `Lesser-known tracks from all ${artists.length} artists`
              : `The biggest songs from all ${artists.length} artists`}
          </em>
        </span>
        <Arrow size={18} />
      </button>

      <div className="search-field">
        <Search />
        <input
          className="picker-search"
          type="search"
          value={query}
          placeholder={`Search artists — pick up to ${MAX_ARTISTS}`}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search artists"
        />
      </div>

      <div className="chips" role="tablist">
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={region === r}
            className={`chip ${region === r ? 'is-on' : ''}`}
            onClick={() => setRegion(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="loading">No artist matches “{query}”.</p>
      ) : (
        <ul className="artist-grid">
          {shown.map((a) => {
            const on = pickedIds.has(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className={`artist-card ${on ? 'is-picked' : ''}`}
                  onClick={() => toggle(a)}
                  disabled={!on && full}
                  aria-pressed={on}
                >
                  <span className="artist-art">
                    {a.k
                      ? <img src={a.k.replace(/\{sz\}/g, 200)} alt="" loading="lazy" />
                      : <span className="artist-fallback" aria-hidden="true">{a.n[0]}</span>}
                    {on && <span className="artist-tick" aria-hidden="true"><Check size={16} /></span>}
                  </span>
                  <strong>{a.n}</strong>
                  <em>{a.c} songs</em>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sticky tray so the selection and the play button stay reachable while
          scrolling a long grid. */}
      {picked.length > 0 && (
        <div className="tray" role="region" aria-label="Selected artists">
          <div className="tray-inner">
            <ul className="tray-chips">
              {picked.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => toggle(a)} aria-label={`Remove ${a.n}`}>
                    {a.n} <Cross size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="tray-go">
              <span className="tray-count">
                {picked.length}/{MAX_ARTISTS} · {picked.length > 1 ? 10 : 5} songs ·{' '}
                {tier === 'deep' ? 'deep cuts' : 'top songs'}
              </span>
              <button type="button" className="btn primary" onClick={() => onPlay(picked, tier)}>
                Play <Arrow size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
