// Thin wrapper over k.play() so the mix lives in one table instead of being
// re-guessed at every call site. Browsers refuse to start audio until the page
// has seen a real user gesture, so the first few sounds of a session can land
// silent -- nothing to fix, just how autoplay policy works.

import type { KAPLAYCtx } from "kaplay";
import { audioSettings } from "./audio";

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

export function sfx(k: KAPLAYCtx, name: SfxName, detune = 0): void {
  // The UI toggle stays audible on purpose: clicking "sfx off" plays its own
  // click, so you get confirmation that the button did something.
  if (!audioSettings.sfx && name !== "buy") return;
  k.play(name, { volume: VOLUME[name], detune });
}
