// A plain <audio> element can't reliably play a 0.1s slice -- seek granularity and
// play() latency swamp it. Decoding into an AudioBuffer lets us schedule an exact
// window on the audio clock instead.

import { findAudioStart } from './onset';
import { FULL_LAYER, buildLayerGraph } from './layers';

const FADE = 0.02;      // taper so clips don't end on a click
const SHORT_FADE = 0.005;
// A decoded 30s stereo buffer is ~10MB in RAM, not the ~1MB it is on the wire.
// Three is enough for the current song, the next one, and a replay.
const MAX_BUFFERS = 3;

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.clips = new Map(); // trackId -> { buffer, onset, duration }
    this.source = null;
    this.onEnded = null;
  }

  // Browsers only allow an AudioContext to start from a user gesture.
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  async #decode(url) {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`preview ${res.status}`);
    return this.ctx.decodeAudioData(await res.arrayBuffer());
  }

  // Apple rotates preview URLs occasionally. The lookup endpoint is CORS-open,
  // so a stale URL can be re-resolved live from the track id we stored.
  async #freshUrl(trackId) {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${trackId}&entity=song&country=US`);
    const data = await res.json();
    const url = data?.results?.find((r) => r.previewUrl)?.previewUrl;
    if (!url) throw new Error('no preview available');
    return url;
  }

  async load(song) {
    if (!song) return null;
    const hit = this.clips.get(song.i);
    if (hit) return hit;
    this.unlock();

    let buffer;
    try {
      buffer = await this.#decode(song.p);
    } catch {
      buffer = await this.#decode(await this.#freshUrl(song.i));
    }

    const onset = findAudioStart(buffer);
    const clip = { buffer, onset, duration: Math.max(0, buffer.duration - onset) };

    this.clips.set(song.i, clip);
    while (this.clips.size > MAX_BUFFERS) {
      this.clips.delete(this.clips.keys().next().value);
    }
    return clip;
  }

  // Fire-and-forget warm-up for the next round.
  preload(song) {
    if (song && !this.clips.has(song.i)) this.load(song).catch(() => {});
  }

  stop() {
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
  }

  // Plays the first `seconds` of audible audio, measured from the onset.
  // `layer` selects how much of the mix is audible -- see audio/layers.js.
  async play(song, seconds, layer = FULL_LAYER) {
    const clip = await this.load(song);
    this.unlock();
    this.stop();

    const length = Math.max(0.02, Math.min(seconds, clip.duration));
    const { src, out } = buildLayerGraph(this.ctx, clip.buffer, layer);
    const gain = this.ctx.createGain();
    // Summing filtered branches can overshoot unity on dense mixes; this catches
    // the peaks so a layered clip never clips on the way out.
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    out.connect(limiter).connect(gain).connect(this.ctx.destination);

    const now = this.ctx.currentTime + 0.01;
    // A 20ms taper would swallow most of a 100ms clip, so shorten it for short clips.
    const fade = Math.min(length < 0.5 ? SHORT_FADE : FADE, length / 3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    gain.gain.setValueAtTime(1, now + length - fade);
    gain.gain.linearRampToValueAtTime(0, now + length);

    src.start(now, clip.onset, length);
    src.stop(now + length);
    this.source = src;

    src.onended = () => {
      if (this.source === src) this.source = null;
      this.onEnded?.();
    };
    return length;
  }
}

export const audio = new AudioEngine();
