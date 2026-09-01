// Player preferences, persisted per browser. localStorage throws outright in
// some embedding contexts rather than just returning null, so every access is
// guarded -- a page that can't remember settings should still play.

const KEY = "flicker.settings";

// What the auto-collector reaches for. It exists because an auto-grabber that
// silently decided for you is worse than no auto-grabber: in an inverted
// universe the "hazards" are the things you want, so the target has to be
// yours to set.
export type AutoTarget = "safe" | "harmful" | "all";

export interface Settings {
  music: boolean;
  sfx: boolean;
  autoCollect: boolean;
  autoTarget: AutoTarget;
  /** Kills shake, slow-motion and heavy particles. */
  reducedMotion: boolean;
}

const DEFAULTS: Settings = {
  music: true,
  sfx: true,
  autoCollect: true,
  autoTarget: "safe",
  reducedMotion: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        music: parsed.music !== false,
        sfx: parsed.sfx !== false,
        autoCollect: parsed.autoCollect !== false,
        autoTarget: parsed.autoTarget ?? DEFAULTS.autoTarget,
        reducedMotion: parsed.reducedMotion === true,
      };
    }
  } catch {
    // No stored preference available -- fall through to the defaults.
  }
  return { ...DEFAULTS };
}

export const settings: Settings = load();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Setting still applies for this session; it just won't survive a reload.
  }
}

export function setMusicEnabled(on: boolean): void {
  settings.music = on;
  persist();
}

export function setSfxEnabled(on: boolean): void {
  settings.sfx = on;
  persist();
}

export function setAutoCollect(on: boolean): void {
  settings.autoCollect = on;
  persist();
}

export function cycleAutoTarget(): AutoTarget {
  const order: AutoTarget[] = ["safe", "all", "harmful"];
  settings.autoTarget = order[(order.indexOf(settings.autoTarget) + 1) % order.length];
  persist();
  return settings.autoTarget;
}

export function setReducedMotion(on: boolean): void {
  settings.reducedMotion = on;
  persist();
}
