# Songless

Guess the song from a fraction of a second. Three game modes, ~400 artists and
38,000 songs from every major music region.

## Modes

| Mode | How it works | Scoring |
|---|---|---|
| **Scrubber** | Opens on 0.1s. Drag the playhead to buy more audio — you can never buy it back. | 10,000 at 0.1s decaying to 3,500 at the full clip. A wrong guess costs 500 but never ends the round. |
| **Bandle** | Start on the drums alone, then bring the band in: bass, chords, melody, vocals. | Drums alone is 10,000, down to 4,000 once the vocal is in. The 0.1s clock still applies on top. |
| **Classic** | The original Heardle steps: 1s, 2s, 4s, 7s, 11s, 16s. | Each miss or skip unlocks the next step and lowers the score. |

Five songs per run, 50,000 points on the table. Play a mixed pool or pick a
single artist's catalogue.

## Running it

```bash
npm install
npm run dev
```

The song library is committed under `public/data`, so it works straight away.

## The song library

Audio comes from the **iTunes Search API** — no key required, and it is one of the
few music APIs that allows direct browser access (`Access-Control-Allow-Origin: *`).
Previews are ~30s AAC clips hot-linked from Apple's CDN, never re-hosted.

```bash
npm run data                  # fetch any artists not already cached, then build
npm run data -- --no-fetch    # rebuild from cache only (~2s) after changing filters
```

Add artists by appending to `scripts/artists.seed.json` and re-running. Raw API
responses are cached in `scripts/.cache` (gitignored), so re-runs only fetch what
is new. Apple rate-limits at roughly 20 requests/minute, and the fetcher is gated
to stay under that — a cold build of 400 artists takes around two hours.

Output:

| File | Size | Loaded when |
|---|---|---|
| `artists.json` | 24 KB gz | Always — powers artist search |
| `artists/<id>.json` | ~30 KB | One artist is picked |
| `hits.json` | 465 KB gz | Mixed mode only |

## Notes on the audio

**0.1s clips need Web Audio, not `<audio>`.** Seek granularity and `play()` latency
swamp a tenth of a second. Previews are decoded into an `AudioBuffer` and scheduled
on the audio clock instead.

**Clips do not start at sample zero.** AAC encoders prepend ~1,000–2,000 samples of
priming, and plenty of previews open on a fade — "We Will Rock You" has 150ms of
digital silence, "We Are the Champions" 470ms. `src/audio/onset.js` finds the first
audible window so a round never plays silence at full price.

**Bandle's layers are filtered, not separated.** These previews are finished stereo
mixes; there are no stems, and real source separation is far too heavy for the
browser. Layers are carved out by frequency band plus a stereo trick — a lead vocal
is nearly always centre-panned, so subtracting the channels cancels it, which is
what makes the final "vocals" layer land. Tune the balance via `MAKEUP` in
`src/audio/layers.js`.

## Licence

Song previews are provided by Apple and remain subject to Apple's terms. This is a
personal project and a tribute to [Songless](https://playdaily.org/songless),
Bandle and Heardle.
