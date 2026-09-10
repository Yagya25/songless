import { LAYERS, FULL_LAYER } from '../audio/layers';
import { LAYER_POINTS } from '../game/scoring';
import { Play as PlayIcon } from './Icons';

export default function LayerStack({ layer, onAdd, onPlayLayer, disabled }) {
  const next = Math.min(FULL_LAYER, layer + 1);
  const atFull = layer >= FULL_LAYER;

  return (
    <div className="layers">
      <ol className="layer-list">
        {LAYERS.map((l, i) => {
          const on = i <= layer;
          return (
            <li key={l.key} className={`layer ${on ? 'is-on' : ''} ${i === layer ? 'is-newest' : ''}`}>
              <button
                type="button"
                className="layer-row"
                disabled={disabled || !on}
                onClick={() => onPlayLayer(i)}
                aria-label={on ? `Play up to ${l.name}` : `${l.name} locked`}
              >
                <span className="layer-idx">{on ? <PlayIcon size={13} /> : i + 1}</span>
                <span className="layer-name">
                  <strong>{l.name}</strong>
                  <em>{l.hint}</em>
                </span>
                <span className="layer-worth">{LAYER_POINTS[i].toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {!atFull && (
        <button type="button" className="btn add-layer" onClick={onAdd} disabled={disabled}>
          Add {LAYERS[next].name}
          <span>drops the ceiling to {LAYER_POINTS[next].toLocaleString()}</span>
        </button>
      )}
      <p className="scrubber-hint">
        {atFull
          ? 'The whole band is playing. Nothing left to add.'
          : 'Bring the band in one at a time. You can’t send them back.'}
      </p>
    </div>
  );
}
