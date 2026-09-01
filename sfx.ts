// Thin wrapper over k.play() so the mix lives in one table instead of being
// re-guessed at every call site. Browsers refuse to start audio until the page
// has seen a real user gesture, so the first few sounds of a session can land
// silent -- nothing to fix, just how autoplay policy works.

import type { KAPLAYCtx } from "kaplay";
import { settings } from "./settings";

export type SfxName = "pickup" | "clear" | "bounce" | "thud" | "jump" | "buy" | "settle";

const VOLUME: Record<SfxName, number> = {
  pickup: 0.35,
  clear: 0.5,
  bounce: 0.4,
  thud: 0.35,
  jump: 0.45,
  buy: 0.5,
  settle: 0.6,
};

// How many interchangeable clips each event has. One clip per event made the
// pickup sound -- the one you hear most -- wear out inside a single universe;
// rotating between several plus the existing pitch shift keeps it alive.
// assets.ts loads exactly these, named `<event><index>.ogg`.
export const SFX_VARIANTS: Record<SfxName, number> = {
  pickup: 4,
  clear: 3,
  bounce: 2,
  thud: 2,
  jump: 3,
  buy: 2,
  settle: 1,
};

export function sfx(k: KAPLAYCtx, name: SfxName, detune = 0): void {
  // The UI toggle stays audible on purpose: clicking "sound off" plays its own
  // click, so you get confirmation that the button did something.
  if (!settings.sfx && name !== "buy") return;
  const variant = Math.floor(Math.random() * SFX_VARIANTS[name]);
  k.play(`${name}${variant}`, { volume: VOLUME[name], detune });
}
