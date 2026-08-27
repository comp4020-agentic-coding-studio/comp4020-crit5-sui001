// Music and SFX on/off, persisted per browser. localStorage throws outright
// in some embedding contexts rather than just returning null, so every access
// is guarded -- a page that can't remember the setting should still play.

const KEY = "flicker.audio";

export interface AudioSettings {
  music: boolean;
  sfx: boolean;
}

function load(): AudioSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      return { music: parsed.music !== false, sfx: parsed.sfx !== false };
    }
  } catch {
    // No stored preference available -- fall through to the default.
  }
  return { music: true, sfx: true };
}

export const audioSettings: AudioSettings = load();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(audioSettings));
  } catch {
    // Setting still applies for this session; it just won't survive a reload.
  }
}

export function setMusicEnabled(on: boolean): void {
  audioSettings.music = on;
  persist();
}

export function setSfxEnabled(on: boolean): void {
  audioSettings.sfx = on;
  persist();
}
