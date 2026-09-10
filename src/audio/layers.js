// Bandle-style layered reveal: start on the drums, add the band one at a time.
//
// These previews are finished stereo mixes -- there are no stems to fetch, and real
// source separation (Demucs and friends) is an ML model far too heavy to run over a
// whole library in a browser. So each part is carved out of the mix instead, by
// frequency band and by stereo position:
//
//   drums    kick (under ~95Hz) plus hats and snare (over ~3.2kHz), midrange scooped
//   bass     a narrow low band, which genuinely does isolate a bassline
//   chords   side channel (L - R), low-mid: rhythm guitar and keys
//   melody   side channel, upper-mid: leads, strings, brass
//   vocals   the untouched mix -- the last layer simply puts the voice back
//
// The side channel is the useful trick: a lead vocal is nearly always centre-panned,
// so subtracting the two channels cancels it and leaves the arrangement behind. That
// is why layers 3 and 4 sound like a karaoke version, and why layer 5 lands.
//
// It is an approximation, not separation, but it reveals a song the same escalating
// way and is honest about what you can actually hear at each step.

export const LAYERS = [
  { key: 'drums', name: 'Drums', hint: 'Kick, snare, hats' },
  { key: 'bass', name: 'Bass', hint: 'The low end' },
  { key: 'chords', name: 'Chords', hint: 'Rhythm guitar and keys' },
  { key: 'melody', name: 'Melody', hint: 'Leads and strings' },
  { key: 'vocals', name: 'Vocals', hint: 'The full mix' },
];

export const FULL_LAYER = LAYERS.length - 1;

// Filtering discards most of a signal's energy, so each branch needs makeup gain.
// The weighting is deliberately far from flat: low frequencies carry most of a
// mix's raw energy but little of its perceived loudness, so a "fair" balance
// buries the midrange and layers 3-5 end up sounding identical to layer 2.
// Lows are pulled well down and the mid bands pushed hard so each added
// instrument is actually audible as a change.
const MAKEUP = { kick: 0.75, crack: 1.7, bass: 0.5, chords: 2.4, melody: 2.6 };

function band(ctx, type, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  if (q != null) f.Q.value = q;
  return f;
}

function gain(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

// The side channel (L - R): cancels anything panned dead centre, i.e. the vocal.
// Falls back to the plain signal on a mono preview, where no side channel exists.
function sideChannel(ctx, src, buffer) {
  if (buffer.numberOfChannels < 2) return src;
  const split = ctx.createChannelSplitter(2);
  const side = ctx.createGain();
  const invert = gain(ctx, -1);
  src.connect(split);
  split.connect(side, 0);
  split.connect(invert, 1);
  invert.connect(side);
  return side;
}

// Returns { src, out }. The caller schedules src and applies its own envelope to out.
export function buildLayerGraph(ctx, buffer, layerIndex) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const out = ctx.createGain();

  if (layerIndex >= FULL_LAYER) {
    src.connect(out);
    return { src, out };
  }

  // 1 - drums: the two spectral extremes, with the pitched middle removed.
  const kick = band(ctx, 'lowpass', 95);
  const kickBody = band(ctx, 'highpass', 35);
  const crack = band(ctx, 'highpass', 3200);
  src.connect(kick).connect(kickBody).connect(gain(ctx, MAKEUP.kick)).connect(out);
  src.connect(crack).connect(gain(ctx, MAKEUP.crack)).connect(out);

  // 2 - bass
  if (layerIndex >= 1) {
    const lo = band(ctx, 'lowpass', 180);
    const hi = band(ctx, 'highpass', 45);
    src.connect(hi).connect(lo).connect(gain(ctx, MAKEUP.bass)).connect(out);
  }

  // 3 - chords, and 4 - melody: the same vocal-cancelled signal, split by register.
  if (layerIndex >= 2) {
    const side = sideChannel(ctx, src, buffer);
    const chords = band(ctx, 'bandpass', 450, 0.8);
    side.connect(chords).connect(gain(ctx, MAKEUP.chords)).connect(out);

    if (layerIndex >= 3) {
      const melody = band(ctx, 'bandpass', 1800, 0.7);
      side.connect(melody).connect(gain(ctx, MAKEUP.melody)).connect(out);
    }
  }

  return { src, out };
}
