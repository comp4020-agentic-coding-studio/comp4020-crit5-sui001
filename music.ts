// A generative score built out of Kenney's CC0 "Music Jingles" pack.
//
// That pack is stingers, not loops -- the longest clip is 1.8 seconds -- so
// looping one would be torture. Instead each theme draws from one instrument
// family and the score fires a random clip from it every couple of seconds at
// low volume, lightly detuned. Short clips, sparse spacing, no fixed pattern:
// it reads as an evolving bed rather than a ringtone, and it never repeats
// itself exactly.

import type { KAPLAYCtx, TimerController } from "kaplay";
import { audioSettings } from "./audio";

export const FAMILIES = ["nes", "hit", "pizzi", "sax", "steel"] as const;
export type Family = (typeof FAMILIES)[number];
export const CLIPS_PER_FAMILY = 6;

// One family per tileset, so the score changes with the scenery.
const FAMILY_BY_SHEET: Record<string, Family> = {
  "tiny-town": "pizzi",
  "tiny-farm": "sax",
  "tiny-dungeon": "hit",
  "tiny-ski": "steel",
  "tiny-battle": "nes",
};

export function familyForSheet(sheet: string): Family {
  return FAMILY_BY_SHEET[sheet] ?? "steel";
}

const BED_VOLUME = 0.18;
const STINGER_VOLUME = 0.45;
const MIN_GAP = 1.7;
const MAX_GAP = 3.9;

let handle: TimerController | null = null;
let family: Family = "steel";

function scheduleNext(k: KAPLAYCtx): void {
  const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
  handle = k.wait(gap, () => {
    // Kept scheduled even while muted, so flipping music back on resumes
    // within a bar or two instead of needing a scene change.
    if (audioSettings.music) {
      const clip = `${family}${Math.floor(Math.random() * CLIPS_PER_FAMILY)}`;
      k.play(clip, { volume: BED_VOLUME, detune: (Math.floor(Math.random() * 5) - 2) * 100 });
    }
    scheduleNext(k);
  });
}

export function startScore(k: KAPLAYCtx, sheet: string): void {
  stopScore();
  family = familyForSheet(sheet);
  scheduleNext(k);
}

export function stopScore(): void {
  handle?.cancel();
  handle = null;
}

// Played on arrival in a new universe -- the same family as the bed that
// follows it, so the jump reads as a key change rather than a random noise.
export function playStinger(k: KAPLAYCtx, sheet: string): void {
  if (!audioSettings.music) return;
  k.play(`${familyForSheet(sheet)}0`, { volume: STINGER_VOLUME });
}
