// AAC encoders prepend ~1000-2000 samples of priming, and plenty of previews open
// on a fade or room tone. Starting a 0.1s clip at sample 0 would therefore play
// audible nothing on a real fraction of tracks -- and the player would be charged
// top-tier score for silence. Find the first moment that actually sounds instead.

const WINDOW_S = 0.005;
const THRESHOLD_DB = -45;
const MAX_SCAN_S = 3;

export function findAudioStart(buffer) {
  const data = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const win = Math.max(1, Math.floor(WINDOW_S * rate));
  const limit = Math.min(data.length, Math.floor(MAX_SCAN_S * rate));
  const threshold = Math.pow(10, THRESHOLD_DB / 20);

  for (let start = 0; start + win <= limit; start += win) {
    let sum = 0;
    for (let i = start; i < start + win; i++) sum += data[i] * data[i];
    if (Math.sqrt(sum / win) > threshold) {
      // Back off one window so the transient's attack isn't clipped off.
      return Math.max(0, (start - win) / rate);
    }
  }
  return 0; // nothing crossed the threshold - play from the top
}
