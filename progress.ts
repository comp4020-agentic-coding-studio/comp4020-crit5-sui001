// What survives between runs, in localStorage. Everything here is derived
// from finished runs -- there is no way to spend it, so a corrupt or missing
// store costs a player their history and nothing they were relying on.

import { type RunTotals, runScore } from "./score";
import { THEMES } from "./themes";

const KEY = "flicker.progress";

// Three to start with. Eight themes handed over at once is a menu; three that
// grow is a reason to come back.
export const STARTING_THEMES = 3;

export interface Progress {
  runs: number;
  bestScore: number;
  bestStreak: number;
  totalUniverses: number;
  unlocked: string[];
}

function defaults(): Progress {
  return {
    runs: 0,
    bestScore: 0,
    bestStreak: 0,
    totalUniverses: 0,
    unlocked: THEMES.slice(0, STARTING_THEMES).map((t) => t.id),
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      const known = new Set(THEMES.map((t) => t.id));
      // Filter against the live theme list: a stored id from a theme that has
      // since been renamed would otherwise unlock nothing and silently shrink
      // the pool.
      const unlocked = (parsed.unlocked ?? []).filter((id) => known.has(id));
      return {
        runs: parsed.runs ?? 0,
        bestScore: parsed.bestScore ?? 0,
        bestStreak: parsed.bestStreak ?? 0,
        totalUniverses: parsed.totalUniverses ?? 0,
        unlocked: unlocked.length > 0 ? unlocked : defaults().unlocked,
      };
    }
  } catch {
    // Unreadable store -- start clean rather than refuse to launch.
  }
  return defaults();
}

export const progress: Progress = load();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Progress still applies this session; it just won't survive a reload.
  }
}

/** Unlocks the next locked theme in list order. Returns it, or null if none. */
export function unlockNextTheme(): string | null {
  const owned = new Set(progress.unlocked);
  const next = THEMES.find((theme) => !owned.has(theme.id));
  if (!next) return null;
  progress.unlocked.push(next.id);
  persist();
  return next.id;
}

export function recordUniverseCleared(): void {
  progress.totalUniverses++;
  unlockNextTheme();
  persist();
}

export function recordRun(totals: RunTotals): number {
  const score = runScore(totals);
  progress.runs++;
  progress.bestScore = Math.max(progress.bestScore, score);
  progress.bestStreak = Math.max(progress.bestStreak, totals.bestCombo);
  persist();
  return score;
}

export function unlockedThemeIds(): string[] {
  return progress.unlocked.length > 0 ? progress.unlocked : defaults().unlocked;
}
