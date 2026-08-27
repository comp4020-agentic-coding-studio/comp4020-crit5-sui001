// One universe definition per "jump". Step 1 hardcodes a single top-down
// entry so main.ts has something real to loop through end-to-end before
// view-modes.ts and the asset pipeline exist.

export type ViewMode = "topdown" | "platformer" | "diorama";

export interface UniverseDef {
  id: string;
  viewMode: ViewMode;
  isGarden: boolean;
  obstacleCount: number;
  resourceThreshold: number;
  resourceKind: string;
}

const UNIVERSE_POOL: UniverseDef[] = [
  {
    id: "placeholder-topdown",
    viewMode: "topdown",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
  },
];

export function rollUniverse(): UniverseDef {
  return UNIVERSE_POOL[Math.floor(Math.random() * UNIVERSE_POOL.length)];
}
