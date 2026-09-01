// A fixed metronome the whole game hangs off. Pure and framework-free so
// spec/beat.test.ts can assert the timing windows without a canvas.
//
// The score used to fire on random gaps, which sounded fine but meant there
// was no beat to play against. Everything -- clip scheduling, the grab bonus,
// the pulse on a lit pickup -- now reads off this one clock, so the music and
// the mechanic are the same thing rather than decoration sitting next to it.

export const BPM = 120;
export const BEAT_SECONDS = 60 / BPM;

// How close to a beat a grab has to land to count. Generous on purpose: this
// is a bonus for feeling the rhythm, not a rhythm game's pass/fail gate.
export const ON_BEAT_TOLERANCE = 0.135;

// Seconds from `time` to the nearest beat, in either direction.
export function distanceToBeat(time: number): number {
  const intoBeat = ((time % BEAT_SECONDS) + BEAT_SECONDS) % BEAT_SECONDS;
  return Math.min(intoBeat, BEAT_SECONDS - intoBeat);
}

export function isOnBeat(time: number, tolerance: number = ON_BEAT_TOLERANCE): boolean {
  return distanceToBeat(time) <= tolerance;
}

// 0 exactly on a beat, rising to 1 exactly between beats. Drives the visual
// pulse, so what you see flashing is literally the window you're aiming for.
export function beatPhase(time: number): number {
  return distanceToBeat(time) / (BEAT_SECONDS / 2);
}

// Seconds to wait from `time` to land on a beat `beats` from now.
export function secondsUntilBeat(time: number, beats: number): number {
  const intoBeat = ((time % BEAT_SECONDS) + BEAT_SECONDS) % BEAT_SECONDS;
  return beats * BEAT_SECONDS - intoBeat;
}
