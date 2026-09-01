// Active abilities: a second thing to press, and something to time. Pure
// cooldown bookkeeping so spec/abilities.test.ts can prove an ability can
// never fire twice inside its cooldown, with no clock and no canvas.

export type AbilityId = "blink" | "purge" | "drag";

export interface AbilityDef {
  id: AbilityId;
  name: string;
  /** The upgrade that unlocks it, so the shop stays the only place to buy in. */
  upgrade: string;
  key: string;
  cooldown: number;
  /** Held down rather than tapped. */
  sustained?: boolean;
}

export const ABILITIES: readonly AbilityDef[] = [
  { id: "blink", name: "blink", upgrade: "blink", key: "q", cooldown: 7 },
  { id: "purge", name: "purge", upgrade: "purge", key: "e", cooldown: 11 },
  { id: "drag", name: "drag", upgrade: "drag", key: "shift", cooldown: 0, sustained: true },
];

export type Cooldowns = Record<string, number>;

export function isReady(cooldowns: Cooldowns, id: AbilityId, now: number): boolean {
  return now >= (cooldowns[id] ?? 0);
}

/** Returns true and stamps the cooldown, or false if it wasn't ready. */
export function tryTrigger(cooldowns: Cooldowns, def: AbilityDef, now: number): boolean {
  if (!isReady(cooldowns, def.id, now)) return false;
  cooldowns[def.id] = now + def.cooldown;
  return true;
}

/** 0 when just fired, 1 when ready again -- drives the HUD chip fill. */
export function readiness(cooldowns: Cooldowns, def: AbilityDef, now: number): number {
  if (def.cooldown <= 0) return 1;
  const readyAt = cooldowns[def.id] ?? 0;
  if (now >= readyAt) return 1;
  return Math.max(0, Math.min(1, 1 - (readyAt - now) / def.cooldown));
}
