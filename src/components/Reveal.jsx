import Burst from './Burst';
import { Arrow, Play as PlayIcon } from './Icons';
import { useCountUp } from '../game/useCountUp';
import { artwork } from '../game/library';
import { LAYERS } from '../audio/layers';

// Its own component so the entrance animation and the score count-up restart
// naturally on every round -- Play keys it by round index.
export default function Reveal({ song, result, isBandle, isLastRound, onReplay, onNext }) {
  const won = Boolean(result?.solved);
  const score = useCountUp(result?.score ?? 0, won ? 900 : 0);
  const art = artwork(song);

  return (
    <div className={`reveal ${won ? 'won' : 'lost'}`}>
      <div className="reveal-art">
        {won && <Burst />}
        {art
          ? <img src={art} alt="" className="cover" />
          : <span className="cover cover-blank" aria-hidden="true">{song.t[0]}</span>}
      </div>

      <p className="reveal-verdict" role="status">
        {won
          ? `Nailed it in ${result.seconds.toFixed(1)}s${isBandle ? ` on ${LAYERS[result.layer].name.toLowerCase()}` : ''}`
          : 'Not this time'}
      </p>

      <h2 className="reveal-title">{song.t}</h2>
      <p className="muted reveal-by">{song.a}{song.y ? ` · ${song.y}` : ''}</p>

      <p className="reveal-score">
        {won ? `+${score.toLocaleString()}` : '+0'}
      </p>

      {result?.wrong > 0 && won && (
        <p className="reveal-note">after {result.wrong} wrong {result.wrong === 1 ? 'guess' : 'guesses'}</p>
      )}

      <div className="reveal-actions">
        <button type="button" className="btn ghost" onClick={onReplay}>
          <PlayIcon size={16} /> Hear the full clip
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          {isLastRound ? 'See results' : 'Next song'} <Arrow size={16} />
        </button>
      </div>
    </div>
  );
}
