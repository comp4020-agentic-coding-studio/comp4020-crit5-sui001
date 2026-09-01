// Module-level singleton, not kaplay's stay() -- scene() bodies fully rerun
// their setup on every go(), so state that must survive a universe jump
// lives here instead.

import type { Cooldowns } from "./abilities";
import type { Modifier } from "./modifiers";
import type { Theme } from "./themes";

export interface RunState {
  theme: Theme | null;
  modifier: Modifier | null;
  /** Non-empty on a daily run, and shown on the summary so scores compare. */
  seedLabel: string;

  // Sparks you have actually kept. This is what the shop spends.
  currency: number;
  // Sparks earned inside the current universe and not yet safe. Clearing the
  // universe banks them; being caught by the chaser loses them. This is the
  // whole push-your-luck decision -- a fat pending pile makes the greedy fork
  // genuinely frightening.
  pending: number;

  // Progress through the CURRENT universe. `threshold` is rolled per universe
  // and fed to isObstacleCleared() -- the one rule under automated test.
  collected: number;
  threshold: number;

  // Filling the pips does not end a universe any more, it starts the run for
  // the exit. 0..1 through that final stretch; `escaping` gates the HUD.
  escaping: boolean;
  escape: number;

  // Clean grabs in a row. Reset by harmful grabs, never by misses -- combo.ts.
  combo: number;
  bestCombo: number;
  // How close the chaser is, 0 (far behind) to 1 (on top of you). Lives here
  // only so the HUD can draw it without reaching into the scene.
  threat: number;

  upgrades: Record<string, number>;
  cooldowns: Cooldowns;
  growthLevel: number;
  clearedUniverseCount: number;
  hazardsDodged: number;
  perfectBeats: number;
  checkpointShown: boolean;
  paused: boolean;
  ended: boolean;
}

function fresh(): RunState {
  return {
    theme: null,
    modifier: null,
    seedLabel: "",
    currency: 0,
    pending: 0,
    collected: 0,
    threshold: 0,
    escaping: false,
    escape: 0,
    combo: 0,
    bestCombo: 0,
    threat: 0,
    upgrades: {},
    cooldowns: {},
    growthLevel: 0,
    clearedUniverseCount: 0,
    hazardsDodged: 0,
    perfectBeats: 0,
    checkpointShown: false,
    paused: false,
    ended: false,
  };
}

export const state: RunState = fresh();

// Starting a new run from the title screen has to wipe the old one, and the
// singleton means that cannot be done by re-importing the module.
export function resetRun(): void {
  Object.assign(state, fresh());
}
