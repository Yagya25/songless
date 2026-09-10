export const CLIP_LENGTH = 30;      // iTunes previews run ~30s
export const START_SECONDS = 0.1;   // what you hear before spending anything
export const MAX_SCORE = 10000;
export const FLOOR_SCORE = 3500;    // what a fully-revealed clip is still worth
export const WRONG_GUESS_COST = 500;
export const SONGS_PER_RUN = 5;

export const HEARDLE_STEPS = [1, 2, 4, 7, 11, 16];
const HEARDLE_SCORES = [10000, 8000, 6500, 5000, 4000, 3500];

// Bandle: drums alone is the full 10,000, and the band costs you on the way in,
// down to 4,000 once the vocal is playing.
export const LAYER_POINTS = [10000, 8500, 7000, 5500, 4000];

const K = 0.25;
const SPAN = CLIP_LENGTH - START_SECONDS;
const TAIL = Math.exp(-K * SPAN);

// Falls fastest at the start, where the first moments carry the most information.
// Normalised so it lands exactly on MAX_SCORE at 0.1s and FLOOR_SCORE at 30s.
export function scrubberScore(seconds) {
  const t = Math.min(Math.max(seconds, START_SECONDS), CLIP_LENGTH);
  const decay = (Math.exp(-K * (t - START_SECONDS)) - TAIL) / (1 - TAIL);
  return Math.round(FLOOR_SCORE + (MAX_SCORE - FLOOR_SCORE) * decay);
}

export function heardleScore(stepIndex) {
  return HEARDLE_SCORES[stepIndex] ?? 0;
}

// How much of the clip you bought still matters in Bandle, so the layer sets the
// ceiling and the time decay scales it -- drums at 0.1s is the full 10,000.
export function bandleScore(layerIndex, seconds) {
  const ceiling = LAYER_POINTS[Math.min(layerIndex, LAYER_POINTS.length - 1)];
  return Math.round(ceiling * (scrubberScore(seconds) / MAX_SCORE));
}

// In Heardle mode a wrong guess already costs you by advancing the reveal step,
// so it isn't charged the flat penalty on top.
export function finalScore({ mode, seconds, stepIndex, layer, wrongGuesses, solved }) {
  if (!solved) return 0;
  if (mode === 'heardle') return heardleScore(stepIndex);
  const base = mode === 'bandle' ? bandleScore(layer, seconds) : scrubberScore(seconds);
  return Math.max(0, base - wrongGuesses * WRONG_GUESS_COST);
}

const RANKS = [
  [45000, 'Music Genius'],
  [40000, 'Golden Ear'],
  [34000, 'Chart Topper'],
  [28000, 'Radio Regular'],
  [22000, 'Casual Listener'],
  [15000, 'Background Noise'],
  [0, 'Silence Enjoyer'],
];

export function rankFor(total) {
  return RANKS.find(([min]) => total >= min)[1];
}

export const maxRunScore = (songs = SONGS_PER_RUN) => songs * MAX_SCORE;
