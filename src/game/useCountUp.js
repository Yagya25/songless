import { useEffect, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Ticks a number up to `target` on an ease-out curve. When the viewer has asked
// for reduced motion the target is returned straight from render, so no effect
// runs and nothing animates.
export function useCountUp(target, duration = 750) {
  const skip = reduced() || duration <= 0;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (skip) return undefined;
    let raf;
    let startedAt;
    const step = (now) => {
      startedAt ??= now;
      const p = Math.min(1, (now - startedAt) / duration);
      setValue(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, skip]);

  return skip ? target : value;
}
