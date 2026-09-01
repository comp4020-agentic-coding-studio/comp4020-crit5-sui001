// What kinds of thing sit beside the road, and which of them bite. Pure and
// framework-free so spec/pickups.test.ts can pin the rules down without a
// canvas.

export type PickupKind = "spark" | "golden" | "beatGem" | "chain" | "decoy" | "hazard";

export const CHAIN_LENGTH = 3;

// Base spark value before the multiplier and the on-beat bonus.
export const GOLDEN_VALUE = 5;
export const CHAIN_BONUS = 8;

// Kinds that hurt when the world is the right way up. A decoy is a hazard
// wearing a spark's coat -- it renders safe until you're nearly on it.
const HARMFUL: ReadonlySet<PickupKind> = new Set<PickupKind>(["hazard", "decoy"]);

// In an inverted universe the polarity flips: the red things are what you
// want and the bright ones bite. Decoys are never generated there -- "a
// disguise, in a world where the disguise is the good outcome" is a puzzle
// with no readable answer, so the generator leaves them out instead.
export function isHarmful(kind: PickupKind, inverted: boolean): boolean {
  const harmful = HARMFUL.has(kind);
  return inverted ? !harmful : harmful;
}

// A decoy only shows its true colours inside this fraction of the reach.
export const DECOY_REVEAL = 0.62;

export function baseValue(kind: PickupKind): number {
  if (kind === "golden") return GOLDEN_VALUE;
  return 1;
}
