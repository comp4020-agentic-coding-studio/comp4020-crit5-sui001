// One seedable random source for everything that shapes a run: which theme,
// which twist, and every decision inside the generator.
//
// It exists so a daily seed is possible at all. With Math.random scattered
// across four modules, "everyone gets the same levels today" cannot be built;
// with one source, it's setSeed() and nothing else changes.

let state = 0;

// mulberry32 -- small, fast, and good enough that consecutive levels don't
// visibly rhyme. Same algorithm the spec files use, so a seed reproduces in a
// test exactly as it did in the browser.
export function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function setSeed(seed: number): void {
  state = seed | 0;
}

// A stable 32-bit hash of a string, so "2026-08-28" always produces the same
// run. Pure, and therefore testable without waiting a day.
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

/** `date` is passed in rather than read, so this stays pure. */
export function dailyKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailySeed(date: Date): number {
  return hashSeed(dailyKey(date));
}
