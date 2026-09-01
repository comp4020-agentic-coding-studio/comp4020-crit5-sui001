import { describe, expect, it } from "vitest";
import { ABILITIES, type Cooldowns, isReady, readiness, tryTrigger } from "../abilities";
import { dailyKey, dailySeed, hashSeed, random, setSeed } from "../rng";
import { WEIGHTS, gradeFor, runScore } from "../score";
import { UPGRADES } from "../upgrades";

// Invariants for the run-level systems: the seed that makes a daily run
// possible, the cooldowns that stop an ability being spammed, and the scoring
// that the summary screen reports.

describe("the seeded source", () => {
  it("replays exactly from the same seed", () => {
    setSeed(12345);
    const first = Array.from({ length: 50 }, () => random());
    setSeed(12345);
    const second = Array.from({ length: 50 }, () => random());
    expect(second).toEqual(first);
  });

  it("diverges from a different seed", () => {
    setSeed(1);
    const a = Array.from({ length: 20 }, () => random());
    setSeed(2);
    const b = Array.from({ length: 20 }, () => random());
    expect(b).not.toEqual(a);
  });

  it("stays inside [0, 1)", () => {
    setSeed(999);
    for (let i = 0; i < 5000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("gives the same key for the same calendar day", () => {
    // Two different clock times on one day must be one run, or "today's run"
    // means something different depending on when you opened the page.
    const morning = new Date(2026, 7, 28, 6, 15);
    const evening = new Date(2026, 7, 28, 23, 45);
    expect(dailyKey(morning)).toBe(dailyKey(evening));
    expect(dailySeed(morning)).toBe(dailySeed(evening));
  });

  it("gives a different key on a different day", () => {
    expect(dailyKey(new Date(2026, 7, 28))).not.toBe(dailyKey(new Date(2026, 7, 29)));
    expect(dailySeed(new Date(2026, 7, 28))).not.toBe(dailySeed(new Date(2026, 7, 29)));
  });

  it("zero-pads so keys sort chronologically", () => {
    expect(dailyKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("hashes deterministically", () => {
    expect(hashSeed("2026-08-28")).toBe(hashSeed("2026-08-28"));
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });
});

describe("ability cooldowns", () => {
  it("every ability names an upgrade that exists", () => {
    // A chip whose upgrade id was renamed would render forever and never fire.
    const ids = new Set(UPGRADES.map((u) => u.id as string));
    for (const def of ABILITIES) {
      expect(ids.has(def.upgrade), `${def.id} points at missing upgrade ${def.upgrade}`).toBe(true);
    }
  });

  it("starts ready", () => {
    const cooldowns: Cooldowns = {};
    for (const def of ABILITIES) expect(isReady(cooldowns, def.id, 0)).toBe(true);
  });

  it("refuses a second trigger inside the cooldown", () => {
    const blink = ABILITIES.find((a) => a.id === "blink")!;
    const cooldowns: Cooldowns = {};
    expect(tryTrigger(cooldowns, blink, 100)).toBe(true);
    expect(tryTrigger(cooldowns, blink, 100 + blink.cooldown - 0.01)).toBe(false);
    expect(tryTrigger(cooldowns, blink, 100 + blink.cooldown)).toBe(true);
  });

  it("keeps cooldowns independent per ability", () => {
    const blink = ABILITIES.find((a) => a.id === "blink")!;
    const purge = ABILITIES.find((a) => a.id === "purge")!;
    const cooldowns: Cooldowns = {};
    expect(tryTrigger(cooldowns, blink, 0)).toBe(true);
    expect(tryTrigger(cooldowns, purge, 0)).toBe(true);
  });

  it("reports readiness from 0 to 1 and never outside it", () => {
    const blink = ABILITIES.find((a) => a.id === "blink")!;
    const cooldowns: Cooldowns = {};
    tryTrigger(cooldowns, blink, 0);
    expect(readiness(cooldowns, blink, 0)).toBeCloseTo(0);
    expect(readiness(cooldowns, blink, blink.cooldown / 2)).toBeCloseTo(0.5);
    expect(readiness(cooldowns, blink, blink.cooldown)).toBe(1);
    expect(readiness(cooldowns, blink, blink.cooldown * 10)).toBe(1);
    expect(readiness(cooldowns, blink, -50)).toBeGreaterThanOrEqual(0);
  });

  it("treats a sustained ability as always ready", () => {
    const drag = ABILITIES.find((a) => a.id === "drag")!;
    const cooldowns: Cooldowns = {};
    expect(readiness(cooldowns, drag, 0)).toBe(1);
  });
});

describe("run scoring", () => {
  const empty = {
    currency: 0,
    bestCombo: 0,
    clearedUniverseCount: 0,
    perfectBeats: 0,
    hazardsDodged: 0,
  };

  it("scores nothing for nothing", () => {
    expect(runScore(empty)).toBe(0);
  });

  it("counts every stat", () => {
    expect(runScore({ ...empty, currency: 10 })).toBe(10 * WEIGHTS.sparks);
    expect(runScore({ ...empty, bestCombo: 10 })).toBe(10 * WEIGHTS.streak);
    expect(runScore({ ...empty, clearedUniverseCount: 2 })).toBe(2 * WEIGHTS.universe);
    expect(runScore({ ...empty, perfectBeats: 7 })).toBe(7 * WEIGHTS.perfectBeat);
    expect(runScore({ ...empty, hazardsDodged: 5 })).toBe(5 * WEIGHTS.dodged);
  });

  it("never goes down when a stat goes up", () => {
    // Monotonic in every input, so no stat can be worth avoiding.
    const base = { currency: 40, bestCombo: 6, clearedUniverseCount: 2, perfectBeats: 4, hazardsDodged: 3 };
    const start = runScore(base);
    for (const key of Object.keys(base) as Array<keyof typeof base>) {
      expect(runScore({ ...base, [key]: base[key] + 1 })).toBeGreaterThan(start);
    }
  });

  it("hands out grades in order", () => {
    expect(gradeFor(0)).toBe("D");
    expect(gradeFor(2000)).toBe("S");
    let previous = "S";
    const order = ["S", "A", "B", "C", "D"];
    for (let score = 2000; score >= 0; score -= 10) {
      const grade = gradeFor(score);
      expect(order.indexOf(grade)).toBeGreaterThanOrEqual(order.indexOf(previous));
      previous = grade;
    }
  });
});
