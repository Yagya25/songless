import { useEffect, useMemo, useState } from 'react';
import { loadArtists, searchArtists } from '../game/library';
import { Arrow, Back, Globe, Search } from '../components/Icons';

export default function ArtistPicker({ onPickArtist, onPickMix, onBack }) {
  const [artists, setArtists] = useState(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
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

      <button type="button" className="mix-card" onClick={onPickMix}>
        <Globe size={24} />
        <span>
          <strong>Mix — every artist</strong>
          <em>The biggest songs from all {artists.length} artists</em>
        </span>
        <Arrow size={18} />
      </button>

      <div className="search-field">
        <Search />
        <input
          className="picker-search"
          type="search"
          value={query}
          placeholder="Search an artist… try Arijit Singh, BTS, Queen"
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
          {shown.map((a) => (
            <li key={a.id}>
              <button type="button" className="artist-card" onClick={() => onPickArtist(a)}>
                {a.k
                  ? <img src={a.k.replace(/\{sz\}/g, 200)} alt="" loading="lazy" />
                  : <span className="artist-fallback" aria-hidden="true">{a.n[0]}</span>}
                <strong>{a.n}</strong>
                <em>{a.c} songs</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
