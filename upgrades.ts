// Pure upgrade shop logic -- no kaplay import. main.ts applies the levels
// to the live scene; this file only owns cost curves, unlock gating, and
// the two required synergies.

import type { RunState } from "./state";

export type UpgradeId =
  | "pickupRadius"
  | "walkSpeed"
  | "autoCollector"
  | "resonanceDiscount"
  | "universalResonance";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  requires?: UpgradeId;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "pickupRadius",
    name: "Wider Pickup Radius",
    description: "Reach a little further for every spark.",
    baseCost: 5,
    costGrowth: 1.6,
    maxLevel: 5,
  },
  {
    id: "walkSpeed",
    name: "Faster Walk Speed",
    description: "The forward pull gets stronger.",
    baseCost: 5,
    costGrowth: 1.6,
    maxLevel: 5,
  },
  {
    id: "autoCollector",
    name: "Auto-Collector",
    description: "Something else starts reaching for you.",
    baseCost: 20,
    costGrowth: 2,
    maxLevel: 1,
  },
  {
    id: "resonanceDiscount",
    name: "Resonance Discount",
    description: "Pickup Radius costs less once you're not reaching alone.",
    baseCost: 15,
    costGrowth: 1,
    maxLevel: 1,
    requires: "autoCollector",
  },
  {
    id: "universalResonance",
    name: "Universal Resonance",
    description: "Every universe's sparks start to count, no matter the kind.",
    baseCost: 40,
    costGrowth: 1,
    maxLevel: 1,
    requires: "autoCollector",
  },
];

export function upgradeLevel(state: RunState, id: UpgradeId): number {
  return state.upgrades[id] ?? 0;
}

export function isUnlocked(state: RunState, def: UpgradeDef): boolean {
  return !def.requires || upgradeLevel(state, def.requires) > 0;
}

export function upgradeCost(state: RunState, def: UpgradeDef): number {
  const level = upgradeLevel(state, def.id);
  let cost = Math.round(def.baseCost * def.costGrowth ** level);

  if (def.id === "pickupRadius" && upgradeLevel(state, "resonanceDiscount") > 0) {
    cost = Math.round(cost * 0.75);
  }

  return cost;
}

export function canBuyUpgrade(state: RunState, def: UpgradeDef): boolean {
  const level = upgradeLevel(state, def.id);
  return isUnlocked(state, def) && level < def.maxLevel && state.currency >= upgradeCost(state, def);
}

export function buyUpgrade(state: RunState, id: UpgradeId): boolean {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def || !canBuyUpgrade(state, def)) return false;

  state.currency -= upgradeCost(state, def);
  state.upgrades[id] = upgradeLevel(state, id) + 1;
  return true;
}
