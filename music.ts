// A generative score built out of Kenney's CC0 "Music Jingles" pack.
//
// That pack is stingers, not loops -- the longest clip is 1.8 seconds -- so
// looping one would be torture. Instead the score fires a random clip every
// couple of seconds at low volume, lightly detuned: short clips, sparse
// spacing, no fixed pattern, so it reads as an evolving bed rather than a
// ringtone.
//
// It also rotates instruments. Pinning one family per tileset meant a long
// stay in one theme sounded like the same eight bars forever, so a universe
// now opens on its tileset's family for identity and drifts to other families
// as it goes.

import type { KAPLAYCtx, TimerController } from "kaplay";
import { settings } from "./settings";
import { secondsUntilBeat } from "./beat";

export const FAMILIES = ["nes", "hit", "pizzi", "sax", "steel"] as const;
export type Family = (typeof FAMILIES)[number];
export const CLIPS_PER_FAMILY = 10;

// Which family a universe opens on, so arriving somewhere still sounds like
// arriving somewhere specific.
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
// Clips land on the metronome in beat.ts rather than on a random gap, so the
// bed states the beat the grab bonus is judged against. Playing four to seven
// beats apart keeps it sparse while still audibly on the grid.
const MIN_BEATS = 4;
const MAX_BEATS = 7;
// Clips played before the score drifts to a different instrument.
const CLIPS_PER_STINT = 7;

let handle: TimerController | null = null;
let family: Family = "steel";
let played = 0;

function rollFamily(exclude: Family): Family {
  const fresh = FAMILIES.filter((f) => f !== exclude);
  return fresh[Math.floor(Math.random() * fresh.length)];
}

function scheduleNext(k: KAPLAYCtx): void {
  const beats = MIN_BEATS + Math.floor(Math.random() * (MAX_BEATS - MIN_BEATS + 1));
  const gap = secondsUntilBeat(k.time(), beats);
  handle = k.wait(gap, () => {
    // Kept scheduled even while muted, so flipping music back on resumes
    // within a bar or two instead of needing a scene change.
    if (settings.music) {
      const clip = `${family}${Math.floor(Math.random() * CLIPS_PER_FAMILY)}`;
      k.play(clip, { volume: BED_VOLUME, detune: (Math.floor(Math.random() * 5) - 2) * 100 });
      played++;
      if (played % CLIPS_PER_STINT === 0) family = rollFamily(family);
    }
    scheduleNext(k);
  });
}

export function startScore(k: KAPLAYCtx, sheet: string): void {
  stopScore();
  family = familyForSheet(sheet);
  played = 0;
  scheduleNext(k);
}

export function stopScore(): void {
  handle?.cancel();
  handle = null;
}

// Played on arrival in a new universe -- the family the bed then opens on, so
// the jump reads as a key change rather than a random noise.
export function playStinger(k: KAPLAYCtx, sheet: string): void {
  if (!settings.music) return;
  const clips = familyForSheet(sheet);
  k.play(`${clips}${Math.floor(Math.random() * 3)}`, { volume: STINGER_VOLUME });
}
