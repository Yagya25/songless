import { useEffect, useMemo, useRef, useState } from 'react';
import { suggest } from '../game/matching';

export default function GuessInput({ songs, onGuess, onSkip, showSkip, disabled }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const options = useMemo(
    () => (value.trim() ? suggest(value, songs) : []),
    [value, songs]
  );

  useEffect(() => {
    const away = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);

  const submit = (text, picked) => {
    if (!text?.trim() || disabled) return;
    onGuess(text, picked);
    setValue('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open || !options.length) {
      if (e.key === 'Enter') { e.preventDefault(); submit(value); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = options[active];
      if (pick) submit(pick.t, pick);
      else submit(value);
    }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="guess" ref={boxRef}>
      <div className="guess-row">
        <input
          ref={inputRef}
          className="guess-input"
          type="text"
          value={value}
          disabled={disabled}
          placeholder="Know it? Type the song title…"
          autoComplete="off"
          spellCheck="false"
          aria-label="Your guess"
          aria-expanded={open && options.length > 0}
          onChange={(e) => { setValue(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {showSkip && (
          <button type="button" className="btn ghost" onClick={onSkip} disabled={disabled}>
            Skip
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          onClick={() => submit(value)}
          disabled={disabled || !value.trim()}
        >
          Guess
        </button>
      </div>

      {open && options.length > 0 && (
        <ul className="guess-list" role="listbox">
          {options.map((s, i) => (
            <li key={`${s.i}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : ''}
                onPointerEnter={() => setActive(i)}
                onClick={() => submit(s.t, s)}
              >
                <strong>{s.t}</strong>
                <span>{s.a}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
