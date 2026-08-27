// Module-level singleton, not kaplay's stay() -- scene() bodies fully rerun
// their setup on every go(), so state that must survive a universe jump
// lives here instead.

import type { UniverseDef } from "./universes";

export interface RunState {
  universe: UniverseDef | null;
  universeIndex: number;
  currency: number;
  obstacleProgress: number[];
  upgrades: Record<string, number>;
  growthLevel: number;
  clearedUniverseCount: number;
  checkpointShown: boolean;
  paused: boolean;
  ended: boolean;
}

export const state: RunState = {
  universe: null,
  universeIndex: 0,
  currency: 0,
  obstacleProgress: [],
  upgrades: {},
  growthLevel: 0,
  clearedUniverseCount: 0,
  checkpointShown: false,
  paused: false,
  ended: false,
};
