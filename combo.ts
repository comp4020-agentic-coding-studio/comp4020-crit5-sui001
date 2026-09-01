// Scoring and streak rules. Pure and framework-free -- no kaplay import -- so
// spec/combo.test.ts exercises the whole reward model with no canvas.
//
// The point of all of this is to make pressing the button able to be WRONG.
// Before it existed, every lit thing was good and a miss cost nothing, so
// there was no decision anywhere in the loop.

import { CHAIN_BONUS, type PickupKind, baseValue } from "./pickups";

export const MAX_MULTIPLIER = 5;
// Clean grabs needed per step up the multiplier.
export const GRABS_PER_STEP = 4;
export const ON_BEAT_BONUS = 2;
export const HAZARD_PENALTY = 3;

export interface ComboState {
  combo: number;
  bestCombo: number;
}

export function multiplierFor(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / GRABS_PER_STEP));
}

export interface GrabOutcome {
  /** Sparks to add; negative when something bites. */
  sparks: number;
  combo: number;
  bestCombo: number;
  multiplier: number;
  /** Whether this grab counted toward clearing the universe. */
  counted: boolean;
  /** A beat gem taken off the beat: no reward, but no punishment either. */
  fizzled: boolean;
}

export interface GrabInput {
  kind: PickupKind;
  /** Already has the universe's inversion applied -- see pickups.isHarmful. */
  harmful: boolean;
  onBeat: boolean;
  /** This grab completed a chain of three in order. */
  chainCompleted: boolean;
  /** The universe modifier's spark multiplier. */
  sparkScale: number;
}

export function resolveGrab(state: ComboState, input: GrabInput): GrabOutcome {
  if (input.harmful) {
    // The whole reason to look before pressing: it costs sparks and it dumps
    // the streak, so a long multiplier is something you can lose.
    return {
      sparks: -HAZARD_PENALTY,
      combo: 0,
      bestCombo: state.bestCombo,
      multiplier: 1,
      counted: false,
      fizzled: false,
    };
  }

  // A beat gem off the beat is a dud, not a mistake. Punishing it would make
  // the safe play "never touch them", which defeats the point of having them.
  if (input.kind === "beatGem" && !input.onBeat) {
    return {
      sparks: 0,
      combo: state.combo,
      bestCombo: state.bestCombo,
      multiplier: multiplierFor(state.combo),
      counted: false,
      fizzled: true,
    };
  }

  const combo = state.combo + 1;
  // Multiplier is read AFTER the increment so the fourth clean grab is the one
  // that visibly pays out the step up, rather than the fifth.
  const multiplier = multiplierFor(combo);
  const beat = input.onBeat ? ON_BEAT_BONUS : 1;
  const chain = input.chainCompleted ? CHAIN_BONUS * multiplier : 0;
  const sparks = Math.round((multiplier * baseValue(input.kind) * beat + chain) * input.sparkScale);

  return {
    sparks,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    multiplier,
    counted: true,
    fizzled: false,
  };
}

// Missing a pickup does NOT break the streak -- the chaser is what punishes
// misses. Two separate pressures reading off two separate mistakes keeps each
// one legible instead of stacking every penalty onto one number.
export function resolveMiss(state: ComboState): ComboState {
  return state;
}
