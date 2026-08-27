// Pure growth math -- no kaplay import. Applied to whatever sprite the
// current universe rolled, so growth survives "every universe is a
// different spirit" instead of depending on one character's own variants.

const MAX_GROWTH_LEVEL = 10;
const BASE_SCALE = 0.6;
const MAX_SCALE = 2.2;
const BASE_SATURATION = 0.35;

const VIVID_COOL: readonly [number, number, number] = [120, 200, 255];
const VIVID_WARM: readonly [number, number, number] = [255, 200, 120];
const GREY = 160;

function growthProgress(level: number): number {
  return Math.min(Math.max(level, 0), MAX_GROWTH_LEVEL) / MAX_GROWTH_LEVEL;
}

export function growthScale(level: number): number {
  const t = growthProgress(level);
  return BASE_SCALE + t * (MAX_SCALE - BASE_SCALE);
}

export function growthTint(level: number, warm = false): [number, number, number] {
  const t = growthProgress(level);
  const saturation = BASE_SATURATION + t * (1 - BASE_SATURATION);
  const vivid = warm ? VIVID_WARM : VIVID_COOL;
  const mix = (channel: number) => Math.round(GREY + (channel - GREY) * saturation);
  return [mix(vivid[0]), mix(vivid[1]), mix(vivid[2])];
}
