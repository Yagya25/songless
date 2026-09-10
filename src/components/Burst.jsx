// A radial confetti burst for a solved round. Plain spans driven by one keyframe,
// so there's no animation library and nothing to clean up -- the whole thing
// unmounts with the reveal.
//
// The scatter is generated from a small integer hash rather than Math.random so
// render stays pure: the same index always yields the same particle, which means
// a re-render can't make the confetti jump mid-flight.
const scatter = (i, salt) => {
  const n = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

const BITS = Array.from({ length: 34 }, (_, i) => ({
  angle: `${(i / 34) * 360 + (scatter(i, 1) * 22 - 11)}deg`,
  reach: `${80 + scatter(i, 2) * 150}px`,
  size: `${3 + scatter(i, 3) * 6}px`,
  delay: `${scatter(i, 4) * 0.1}s`,
  spin: `${scatter(i, 5) * 360}deg`,
  square: scatter(i, 6) > 0.55,
}));

export default function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {BITS.map((b, i) => (
        <i
          key={i}
          className={b.square ? 'sq' : ''}
          style={{ '--a': b.angle, '--r': b.reach, '--s': b.size, '--d': b.delay, '--spin': b.spin }}
        />
      ))}
    </div>
  );
}
