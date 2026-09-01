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
import { SFX_VARIANTS } from "./sfx";
import { SHEETS } from "./themes";

// The bundled face, loaded either way so switching to it is a one-word change.
const BUNDLED_FONT = "kenney";

// kaplay resolves a text `font` by looking for a bitmap font, then a loaded
// font, then falling back to any browser family that document.fonts.check()
// accepts. A plain system sans wins here on the one axis that matters: the
// bundled Kenney faces are display fonts, and at UI sizes their stylised caps
// turned "SPARKS" into "SPARHS" and "PICKUP" into "PICHUP". Legibility beats
// theming for a HUD -- swap this to BUNDLED_FONT if you'd rather have the
// pixel look back.
function resolveUiFont(): string {
  try {
    if (typeof document !== "undefined" && document.fonts?.check("64px sans-serif")) {
      return "sans-serif";
    }
  } catch {
    // check() throws on some shorthand parses; fall through to the bundled face.
  }
  return BUNDLED_FONT;
}

export const UI_FONT = resolveUiFont();

export function loadAssets(k: KAPLAYCtx): void {
  k.loadFont(BUNDLED_FONT, "fonts/kenney-future.ttf");

  for (const sheet of SHEETS) {
    k.loadSprite(sheet.name, `tilesets/${sheet.name}.png`, {
      sliceX: sheet.cols,
      sliceY: sheet.rows,
    });
  }

  for (const [name, count] of Object.entries(SFX_VARIANTS)) {
    for (let i = 0; i < count; i++) {
      k.loadSound(`${name}${i}`, `audio/${name}${i}.ogg`);
    }
  }

  for (const family of FAMILIES) {
    for (let i = 0; i < CLIPS_PER_FAMILY; i++) {
      k.loadSound(`${family}${i}`, `music/${family}${i}.ogg`);
    }
  }
}
