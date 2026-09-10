import { useCallback, useEffect, useMemo, useState } from 'react';
import { audio } from '../audio/engine';
import { isCorrect } from './matching';
import {
  CLIP_LENGTH, HEARDLE_STEPS, SONGS_PER_RUN, START_SECONDS,
  WRONG_GUESS_COST, bandleScore, finalScore, heardleScore, scrubberScore,
} from './scoring';
import { FULL_LAYER } from '../audio/layers';
import { pickRound } from './library';

export function useGame({ mode, pool, poolLabel, songCount = SONGS_PER_RUN }) {
  const [songs, setSongs] = useState(() => pickRound(pool, songCount));
  const [round, setRound] = useState(0);
  const [unlocked, setUnlocked] = useState(START_SECONDS);
  const [stepIndex, setStepIndex] = useState(0);
  const [layer, setLayer] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('playing'); // playing | revealed | done
  const [playing, setPlaying] = useState(false);

  const song = songs[round];
  const isHeardle = mode === 'heardle';
  const isBandle = mode === 'bandle';

  const available = isHeardle
    ? HEARDLE_STEPS[Math.min(stepIndex, HEARDLE_STEPS.length - 1)]
    : unlocked;

  const wrongCount = guesses.filter((g) => !g.correct).length;

  const potential = useMemo(() => {
    if (isHeardle) return heardleScore(stepIndex);
    const base = isBandle ? bandleScore(layer, unlocked) : scrubberScore(unlocked);
    return Math.max(0, base - wrongCount * WRONG_GUESS_COST);
  }, [isHeardle, isBandle, stepIndex, layer, unlocked, wrongCount]);

  useEffect(() => {
    audio.onEnded = () => setPlaying(false);
    return () => { audio.onEnded = null; };
  }, []);

  useEffect(() => {
    audio.preload(songs[round + 1]);
  }, [songs, round]);

  // Dev-only handle so the round can be driven from a test harness.
  // `import.meta.env.DEV` is statically false in a production build, so this
  // whole branch is dropped at build time.
  useEffect(() => {
    if (import.meta.env.DEV) window.__songless = { song, round, mode };
  }, [song, round, mode]);

  useEffect(() => () => audio.stop(), []);

  const play = useCallback(async (seconds = available, atLayer = layer) => {
    setPlaying(true);
    try {
      await audio.play(song, seconds, isBandle ? atLayer : FULL_LAYER);
    } catch {
      setPlaying(false);
    }
  }, [song, available, layer, isBandle]);

  // Adding an instrument ratchets, exactly like buying seconds.
  const addLayer = useCallback(() => {
    setLayer((prev) => {
      const next = Math.min(FULL_LAYER, prev + 1);
      if (next !== prev) play(undefined, next);
      return next;
    });
  }, [play]);

  const stop = useCallback(() => { audio.stop(); setPlaying(false); }, []);

  // Buying more of the clip ratchets -- you can never give seconds back.
  const buyTo = useCallback((seconds) => {
    setUnlocked((prev) => Math.min(CLIP_LENGTH, Math.max(prev, seconds)));
  }, []);

  const finishRound = useCallback((solved) => {
    audio.stop();
    setPlaying(false);
    const score = finalScore({
      mode, seconds: unlocked, stepIndex, layer, wrongGuesses: wrongCount, solved,
    });
    setResults((r) => [...r, {
      song, solved, score, layer,
      seconds: isHeardle ? HEARDLE_STEPS[Math.min(stepIndex, 5)] : unlocked,
      wrong: wrongCount,
    }]);
    setPhase('revealed');
  }, [mode, unlocked, stepIndex, layer, wrongCount, song, isHeardle]);

  // Classic mode plays the newly unlocked, longer clip straight away.
  const advanceStep = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= HEARDLE_STEPS.length) { finishRound(false); return; }
    setStepIndex(next);
    play(HEARDLE_STEPS[next]);
  }, [stepIndex, finishRound, play]);

  const guess = useCallback((text, picked) => {
    if (phase !== 'playing' || !text.trim()) return false;
    const right = isCorrect(text, song, picked);
    setGuesses((g) => [...g, { text, correct: right }]);

    if (right) {
      finishRound(true);
      return true;
    }
    if (isHeardle) advanceStep();
    return false;
  }, [phase, song, isHeardle, advanceStep, finishRound]);

  const skip = useCallback(() => {
    if (phase !== 'playing') return;
    setGuesses((g) => [...g, { text: null, correct: false, skipped: true }]);
    advanceStep();
  }, [phase, advanceStep]);

  const giveUp = useCallback(() => {
    if (phase === 'playing') finishRound(false);
  }, [phase, finishRound]);

  const next = useCallback(() => {
    audio.stop();
    setPlaying(false);
    if (round + 1 >= songs.length) { setPhase('done'); return; }
    setRound((r) => r + 1);
    setUnlocked(START_SECONDS);
    setStepIndex(0);
    setLayer(0);
    setGuesses([]);
    setPhase('playing');
  }, [round, songs.length]);

  const restart = useCallback(() => {
    audio.stop();
    setSongs(pickRound(pool, songCount));
    setRound(0);
    setUnlocked(START_SECONDS);
    setStepIndex(0);
    setLayer(0);
    setGuesses([]);
    setResults([]);
    setPhase('playing');
    setPlaying(false);
  }, [pool, songCount]);

  const total = results.reduce((n, r) => n + r.score, 0);

  return {
    mode, poolLabel, song, songs, round, phase, playing,
    unlocked, stepIndex, layer, available, guesses, results, total, potential,
    play, stop, buyTo, addLayer, guess, skip, giveUp, next, restart,
  };
}
