// Module-level singleton, not kaplay's stay() -- scene() bodies fully rerun
// their setup on every go(), so state that must survive a universe jump
// lives here instead.

import type { Theme } from "./themes";

export interface RunState {
  theme: Theme | null;
  currency: number;
  // Progress through the CURRENT universe. `threshold` is rolled per universe
  // and fed to isObstacleCleared() -- the one rule under automated test.
  collected: number;
  threshold: number;
  upgrades: Record<string, number>;
  growthLevel: number;
  clearedUniverseCount: number;
  checkpointShown: boolean;
  paused: boolean;
  ended: boolean;
}

export const state: RunState = {
  theme: null,
  currency: 0,
  collected: 0,
  threshold: 0,
  upgrades: {},
  growthLevel: 0,
  clearedUniverseCount: 0,
  checkpointShown: false,
  paused: false,
  ended: false,
};
