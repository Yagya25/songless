// Renders the run result as a PNG so sharing to WhatsApp sends a card instead of
// a wall of monospace text. Drawn directly on a canvas rather than rasterising the
// DOM: no library, and the layout is designed for a 4:5 chat preview instead of
// being a screenshot of a web page that happens to be the wrong shape.
//
// Apple's artwork CDN sends Access-Control-Allow-Origin: *, so the thumbnails can
// be drawn with crossOrigin="anonymous" without tainting the canvas -- without
// that, toBlob() would throw a security error.

import { artwork } from './library';
import { MAX_SCORE, rankFor } from './scoring';

const W = 1080;
const HEAD_H = 500;   // wordmark through the score block
const FOOT_H = 120;
const GAP = 12;

const INK = '#0a0a0c';
const SURFACE = '#16161c';
const LINE = 'rgba(255,255,255,.09)';
const TEXT = '#f2f1ee';
const MUTED = '#8b8b95';
const DIM = '#61616b';
const ACCENT = '#d8ff47';

const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

const MODE_LABEL = { scrubber: 'Scrubber', bandle: 'Bandle', heardle: 'Classic' };

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a missing thumbnail must not fail the card
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipsis(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

export async function renderShareCard({ results, total, poolLabel, mode }) {
  // A 10-song multi-artist run has twice the rows of a 5-song one, so the canvas
  // grows with the content -- a fixed height silently clipped the last rows. Long
  // runs also get tighter rows so the image stays a shareable shape.
  const rowH = results.length > 6 ? 104 : 132;
  const H = HEAD_H + results.length * (rowH + GAP) + FOOT_H;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Canvas resolves fonts against the document, so wait for the webfonts or the
  // card silently falls back to a system face.
  try { await document.fonts?.ready; } catch { /* not supported */ }

  const covers = await Promise.all(results.map((r) => loadImage(artwork(r.song, 200))));

  // ---- background ----
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, -120, 0, W * 0.5, -120, 760);
  glow.addColorStop(0, 'rgba(216,255,71,.14)');
  glow.addColorStop(1, 'rgba(216,255,71,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);

  // ---- wordmark ----
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ACCENT;
  for (let i = 0; i < 5; i++) {
    const h = [16, 34, 54, 34, 12][i];
    roundRect(ctx, 72 + i * 15, 96 - h / 2, 8, h, 4);
    ctx.fill();
  }
  ctx.fillStyle = TEXT;
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText('Songless', 168, 110);

  ctx.fillStyle = DIM;
  ctx.font = `500 26px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(MODE_LABEL[mode] ?? 'Scrubber', W - 72, 110);
  ctx.textAlign = 'left';

  // ---- rank + score ----
  const rank = rankFor(total, results.length);
  ctx.textAlign = 'center';
  ctx.fillStyle = DIM;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(ellipsis(ctx, poolLabel.toUpperCase(), W - 200), W / 2, 214);

  ctx.fillStyle = ACCENT;
  ctx.font = `italic 400 104px ${SERIF}`;
  ctx.fillText(ellipsis(ctx, rank, W - 140), W / 2, 322);

  const max = results.length * MAX_SCORE;
  ctx.font = `600 76px ${SANS}`;
  ctx.fillStyle = TEXT;
  const scoreText = total.toLocaleString();
  const outOf = ` / ${max.toLocaleString()}`;
  ctx.font = `400 34px ${SANS}`;
  const outW = ctx.measureText(outOf).width;
  ctx.font = `600 76px ${SANS}`;
  const scoreW = ctx.measureText(scoreText).width;
  const startX = (W - (scoreW + outW)) / 2;
  ctx.textAlign = 'left';
  ctx.fillText(scoreText, startX, 428);
  ctx.font = `400 34px ${SANS}`;
  ctx.fillStyle = DIM;
  ctx.fillText(outOf, startX + scoreW, 428);

  // ---- song rows ----
  const top = HEAD_H;
  const artSize = rowH - 40;
  results.forEach((r, i) => {
    const y = top + i * (rowH + GAP);
    ctx.fillStyle = SURFACE;
    roundRect(ctx, 72, y, W - 144, rowH, 22);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    const img = covers[i];
    const ax = 92;
    const ay = y + (rowH - artSize) / 2;
    ctx.save();
    roundRect(ctx, ax, ay, artSize, artSize, 14);
    ctx.clip();
    if (img) {
      ctx.globalAlpha = r.solved ? 1 : 0.4;
      ctx.drawImage(img, ax, ay, artSize, artSize);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#24242c';
      ctx.fillRect(ax, ay, artSize, artSize);
      ctx.fillStyle = MUTED;
      ctx.font = `600 40px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(r.song.t[0] ?? '?', ax + artSize / 2, ay + artSize / 2 + 14);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Right-hand score block, measured first so the title knows its budget.
    const pts = r.solved ? r.score.toLocaleString() : '0';
    const when = r.solved ? `${r.seconds.toFixed(1)}s` : 'missed';
    ctx.font = `600 36px ${SANS}`;
    const ptsW = ctx.measureText(pts).width;
    ctx.font = `400 24px ${SANS}`;
    const whenW = ctx.measureText(when).width;
    const rightW = Math.max(ptsW, whenW);

    ctx.textAlign = 'right';
    ctx.font = `600 36px ${SANS}`;
    ctx.fillStyle = r.solved ? TEXT : DIM;
    ctx.fillText(pts, W - 96, y + rowH * 0.47);
    ctx.font = `400 24px ${SANS}`;
    ctx.fillStyle = DIM;
    ctx.fillText(when, W - 96, y + rowH * 0.73);
    ctx.textAlign = 'left';

    const textX = ax + artSize + 26;
    const textW = W - 96 - rightW - 34 - textX;
    ctx.fillStyle = r.solved ? TEXT : MUTED;
    ctx.font = `600 34px ${SANS}`;
    ctx.fillText(ellipsis(ctx, r.song.t, textW), textX, y + rowH * 0.45);
    ctx.fillStyle = DIM;
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(ellipsis(ctx, r.song.a, textW), textX, y + rowH * 0.74);
  });

  // ---- footer ----
  ctx.textAlign = 'center';
  ctx.fillStyle = DIM;
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText('songless-murex.vercel.app', W / 2, H - 58);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode image'))), 'image/png')
  );
}

export function shareText({ results, total, poolLabel, mode }) {
  const medal = (s) => (s >= 9000 ? '🟩' : s >= 6000 ? '🟨' : s > 0 ? '🟧' : '⬛');
  return [
    `🎧 Songless — ${poolLabel} · ${MODE_LABEL[mode] ?? 'Scrubber'}`,
    `${total.toLocaleString()} / ${(results.length * MAX_SCORE).toLocaleString()} · ${rankFor(total, results.length)}`,
    '',
    ...results.map(
      (r, i) => `${i + 1}  ${r.solved ? `${r.seconds.toFixed(1)}s` : '—'}  ${medal(r.score)}`
    ),
    '',
    'https://songless-murex.vercel.app',
  ].join('\n');
}

// Tries the richest option the device supports: an image via the share sheet
// (which is what WhatsApp picks up), then a file download, then text.
export async function shareResult(run) {
  const text = shareText(run);
  let blob;
  try {
    blob = await renderShareCard(run);
  } catch {
    blob = null;
  }

  if (blob) {
    const file = new File([blob], 'songless-result.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
      }
    }
    // No file sharing here (most desktops) -- hand over the PNG to attach.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'songless-result.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
