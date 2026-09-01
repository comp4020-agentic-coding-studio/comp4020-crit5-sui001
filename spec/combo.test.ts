import { describe, expect, it } from "vitest";
import { BEAT_SECONDS, beatPhase, distanceToBeat, isOnBeat, secondsUntilBeat } from "../beat";
import type { GrabInput } from "../combo";
import {
  GRABS_PER_STEP,
  HAZARD_PENALTY,
  MAX_MULTIPLIER,
  ON_BEAT_BONUS,
  multiplierFor,
  resolveGrab,
  resolveMiss,
} from "../combo";

// Invariants for the reward model. The whole point of hazards and streaks is
// that pressing the button can be WRONG; these pin down the rules that make
// that true, with no canvas in the way.

describe("the beat clock", () => {
  it("puts zero distance on an exact beat", () => {
    expect(distanceToBeat(0)).toBeCloseTo(0);
    expect(distanceToBeat(BEAT_SECONDS * 4)).toBeCloseTo(0);
  });

  it("puts maximum distance exactly between beats", () => {
    expect(distanceToBeat(BEAT_SECONDS / 2)).toBeCloseTo(BEAT_SECONDS / 2);
  });

  it("never reports a distance beyond half a beat", () => {
    for (let t = 0; t < 10; t += 0.017) {
      expect(distanceToBeat(t)).toBeLessThanOrEqual(BEAT_SECONDS / 2 + 1e-9);
    }
  });

  it("counts just-before and just-after a beat as on it", () => {
    expect(isOnBeat(BEAT_SECONDS * 3 - 0.05)).toBe(true);
    expect(isOnBeat(BEAT_SECONDS * 3 + 0.05)).toBe(true);
  });

  it("rejects the middle of a bar", () => {
    expect(isOnBeat(BEAT_SECONDS * 3 + BEAT_SECONDS / 2)).toBe(false);
  });

  it("reports phase 0 on the beat and 1 between beats", () => {
    expect(beatPhase(0)).toBeCloseTo(0);
    expect(beatPhase(BEAT_SECONDS / 2)).toBeCloseTo(1);
  });

  it("always waits forward to land on a beat", () => {
    for (let t = 0; t < 3; t += 0.031) {
      const wait = secondsUntilBeat(t, 4);
      expect(wait).toBeGreaterThan(0);
      expect(distanceToBeat(t + wait)).toBeCloseTo(0);
    }
  });
});

describe("the multiplier", () => {
  it("starts at 1", () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(GRABS_PER_STEP - 1)).toBe(1);
  });

  it("steps up every few clean grabs", () => {
    expect(multiplierFor(GRABS_PER_STEP)).toBe(2);
    expect(multiplierFor(GRABS_PER_STEP * 2)).toBe(3);
  });

  it("caps", () => {
    expect(multiplierFor(10_000)).toBe(MAX_MULTIPLIER);
  });

  it("never goes backwards as the streak grows", () => {
    let previous = 0;
    for (let combo = 0; combo < 200; combo++) {
      const current = multiplierFor(combo);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});

describe("resolving a grab", () => {
  const fresh = { combo: 0, bestCombo: 0 };
  const input = (over: Partial<GrabInput> = {}): GrabInput => ({
    kind: "spark",
    harmful: false,
    onBeat: false,
    chainCompleted: false,
    sparkScale: 1,
    ...over,
  });

  it("pays the multiplier for a clean grab", () => {
    const out = resolveGrab(fresh, input());
    expect(out.sparks).toBe(1);
    expect(out.combo).toBe(1);
    expect(out.counted).toBe(true);
  });

  it("pays extra on the beat", () => {
    const off = resolveGrab(fresh, input());
    const on = resolveGrab(fresh, input({ onBeat: true }));
    expect(on.sparks).toBe(off.sparks * ON_BEAT_BONUS);
  });

  it("charges for a hazard and dumps the streak", () => {
    const out = resolveGrab({ combo: 12, bestCombo: 12 }, input({ kind: "hazard", harmful: true, onBeat: true }));
    expect(out.sparks).toBe(-HAZARD_PENALTY);
    expect(out.combo).toBe(0);
    expect(out.multiplier).toBe(1);
    expect(out.counted).toBe(false);
  });

  it("does not let a hazard count toward clearing the universe", () => {
    // Otherwise the fastest way through a universe would be to eat every bomb
    // in it, which would make the hazard a shortcut instead of a threat.
    for (const onBeat of [true, false]) {
      expect(resolveGrab(fresh, input({ kind: "hazard", harmful: true, onBeat })).counted).toBe(false);
    }
  });

  it("remembers the best streak across a reset", () => {
    let s = { combo: 0, bestCombo: 0 };
    for (let i = 0; i < 9; i++) {
      const out = resolveGrab(s, input());
      s = { combo: out.combo, bestCombo: out.bestCombo };
    }
    expect(s.bestCombo).toBe(9);
    const bitten = resolveGrab(s, input({ kind: "hazard", harmful: true }));
    expect(bitten.combo).toBe(0);
    expect(bitten.bestCombo).toBe(9);
  });

  it("keeps a hazard strictly worse than skipping one", () => {
    // Skipping costs nothing from the scoring model; grabbing must never be
    // the better play, at any streak length.
    for (const combo of [0, 3, 7, 20, 99]) {
      const out = resolveGrab({ combo, bestCombo: combo }, input({ kind: "hazard", harmful: true, onBeat: true }));
      expect(out.sparks).toBeLessThan(0);
      expect(out.combo).toBeLessThan(combo + 1);
    }
  });
});

describe("resolving a miss", () => {
  it("leaves the streak alone -- the chaser is what punishes misses", () => {
    const s = { combo: 6, bestCombo: 9 };
    expect(resolveMiss(s)).toEqual(s);
  });
});
