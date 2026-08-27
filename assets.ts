// Centralizes every load* call behind one loadAssets(), called once before the
// first go().
//
// Tilesets load as ONE packed sheet each with sliceX/sliceY, which means a
// tile index is literally a kaplay sprite frame: no atlas JSON, no per-tile
// requests, and a whole level batches into very few draw calls because every
// tile in it shares a texture.
//
// Art is Kenney's CC0 Tiny Town / Tiny Farm / Tiny Dungeon / Tiny Ski / Tiny
// Battle packs. Audio is Kenney's CC0 Interface Sounds, Impact Sounds and
// Music Jingles packs, renamed on the way in so a filename says what the
// sound is *for* rather than what it sounds like.

import type { KAPLAYCtx } from "kaplay";
import { CLIPS_PER_FAMILY, FAMILIES } from "./music";
import { SHEETS } from "./themes";

export function loadAssets(k: KAPLAYCtx): void {
  for (const sheet of SHEETS) {
    k.loadSprite(sheet.name, `tilesets/${sheet.name}.png`, {
      sliceX: sheet.cols,
      sliceY: sheet.rows,
    });
  }

  k.loadSound("pickup", "audio/pickup.ogg");
  k.loadSound("clear", "audio/clear.ogg");
  k.loadSound("bounce", "audio/bounce.ogg");
  k.loadSound("thud", "audio/thud.ogg");
  k.loadSound("jump", "audio/jump.ogg");
  k.loadSound("buy", "audio/buy.ogg");
  k.loadSound("settle", "audio/settle.ogg");

  for (const family of FAMILIES) {
    for (let i = 0; i < CLIPS_PER_FAMILY; i++) {
      k.loadSound(`${family}${i}`, `music/${family}${i}.ogg`);
    }
  }
}
