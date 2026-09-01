import { describe, expect, it } from "vitest";
import { generateLevel } from "../level";
import { MODIFIERS, resetModifierHistory, rollModifier } from "../modifiers";
import { CHAIN_LENGTH, isHarmful } from "../pickups";
import { THEMES } from "../themes";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 64;
const ROWS = 15;
const PICKUP_TARGET = 9;
const SEEDS = [3, 19, 512, 7777];

describe("modifier definitions stay inside sane bounds", () => {
  it.each(MODIFIERS.map((m) => [m.id, m] as const))("%s cannot make a universe impossible", (_id, m) => {
    // A reach of zero, or a walk of zero, is a universe nobody can finish.
    expect(m.reachScale).toBeGreaterThan(0.4);
    expect(m.speedScale).toBeGreaterThan(0.4);
    expect(m.sparkScale).toBeGreaterThan(0);
    expect(m.pickupScale).toBeGreaterThan(0.4);
    expect(m.hazardBias).toBeGreaterThanOrEqual(0);
    expect(m.hazardBias).toBeLessThan(0.5);
  });

  it("never rolls the same twist twice running", () => {
    resetModifierHistory();
    const random = mulberry32(4242);
    let previous = rollModifier(random).id;
    for (let i = 0; i < 400; i++) {
      const next = rollModifier(random).id;
      expect(next).not.toBe(previous);
      previous = next;
    }
  });
});

describe("levels stay winnable under every modifier", () => {
  const cases = MODIFIERS.flatMap((m) =>
    SEEDS.map((seed) => [m.id, m, seed] as const),
  );

  it.each(cases)("%s seed %s: the safe spine still clears it", (_id, modifier, seed) => {
    for (const theme of THEMES) {
      const level = generateLevel(theme, {
        cols: COLS,
        rows: ROWS,
        pickupTarget: PICKUP_TARGET,
        hazardBias: modifier.hazardBias,
        pickupScale: modifier.pickupScale,
        inverted: modifier.inverted,
        random: mulberry32(seed),
      });
      const guaranteed = level.pickups.filter(
        (p) =>
          !p.harmful &&
          !p.onBranch &&
          (p.kind === "spark" || p.kind === "golden" || p.kind === "hazard"),
      );
      expect(
        guaranteed.length,
        `${theme.id} under ${modifier.id} left only ${guaranteed.length} guaranteed pickups`,
      ).toBeGreaterThanOrEqual(PICKUP_TARGET);
    }
  });

  it.each(cases)("%s seed %s: harmfulness matches the polarity", (_id, modifier, seed) => {
    for (const theme of THEMES) {
      const level = generateLevel(theme, {
        cols: COLS,
        rows: ROWS,
        pickupTarget: PICKUP_TARGET,
        hazardBias: modifier.hazardBias,
        pickupScale: modifier.pickupScale,
        inverted: modifier.inverted,
        random: mulberry32(seed),
      });
      for (const pickup of level.pickups) {
        expect(pickup.harmful).toBe(isHarmful(pickup.kind, modifier.inverted));
      }
    }
  });
});

describe("inversion runs a stripped palette", () => {
  it("never places a decoy in an inverted universe", () => {
    // A disguise whose reveal is GOOD news is unreadable, so the generator
    // leaves them out rather than shipping a puzzle with no answer.
    for (const theme of THEMES) {
      for (const seed of SEEDS) {
        const level = generateLevel(theme, {
          cols: COLS,
          rows: ROWS,
          pickupTarget: PICKUP_TARGET,
          inverted: true,
          random: mulberry32(seed),
        });
        expect(level.pickups.some((p) => p.kind === "decoy")).toBe(false);
        expect(level.pickups.some((p) => p.kind === "beatGem")).toBe(false);
        expect(level.pickups.some((p) => p.kind === "chain")).toBe(false);
      }
    }
  });

  it("makes the red things the good ones", () => {
    expect(isHarmful("hazard", true)).toBe(false);
    expect(isHarmful("spark", true)).toBe(true);
    expect(isHarmful("hazard", false)).toBe(true);
    expect(isHarmful("spark", false)).toBe(false);
  });
});

describe("chains are never left half-built", () => {
  // A chain of three that only placed two links can never be completed, so it
  // would sit in the level as a bonus the rules cannot pay out. The generator
  // demotes a short chain back to plain sparks; this is that guarantee.
  const cases = THEMES.flatMap((theme, i) => SEEDS.map((seed) => [theme.id, i, seed] as const));

  it.each(cases)("%s seed %s: every chain is whole and in order", (_id, themeIndex, seed) => {
    const level = generateLevel(THEMES[themeIndex], {
      cols: COLS,
      rows: ROWS,
      pickupTarget: PICKUP_TARGET,
      random: mulberry32(seed),
    });
    const byId = new Map<number, number[]>();
    for (const pickup of level.pickups) {
      if (pickup.chainId === undefined || pickup.chainIndex === undefined) continue;
      const links = byId.get(pickup.chainId) ?? [];
      links.push(pickup.chainIndex);
      byId.set(pickup.chainId, links);
    }
    for (const [id, links] of byId) {
      expect(links.length, `chain ${id} has ${links.length} links`).toBe(CHAIN_LENGTH);
      expect([...links].sort()).toEqual([...Array(CHAIN_LENGTH).keys()]);
    }
  });

  it.each(cases)("%s seed %s: chain links always carry both fields", (_id, themeIndex, seed) => {
    const level = generateLevel(THEMES[themeIndex], {
      cols: COLS,
      rows: ROWS,
      pickupTarget: PICKUP_TARGET,
      random: mulberry32(seed),
    });
    for (const pickup of level.pickups) {
      expect(pickup.chainId === undefined).toBe(pickup.chainIndex === undefined);
      if (pickup.chainId !== undefined) expect(pickup.kind).toBe("chain");
    }
  });
});
