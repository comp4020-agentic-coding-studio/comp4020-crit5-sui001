// One universe definition per "jump". Placeholder rects, one per view mode,
// so the one-scene view-mode abstraction is proven before any art exists.

export type ViewMode = "topdown" | "platformer" | "diorama";

export interface UniverseDef {
  id: string;
  viewMode: ViewMode;
  isGarden: boolean;
  obstacleCount: number;
  resourceThreshold: number;
  resourceKind: string;
}

// The rare "it goes right" universe, temporarily forced to 1 while eyeballing
// pacing -- dial back to ~0.2 once the checkpoint/ending flow is verified.
const GARDEN_CHANCE = 0.2;

const MISMATCHED_POOL: UniverseDef[] = [
  {
    id: "placeholder-topdown",
    viewMode: "topdown",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
  },
  {
    id: "placeholder-platformer",
    viewMode: "platformer",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
  },
  {
    id: "placeholder-diorama",
    viewMode: "diorama",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
  },
];

// Garden can land on any of the 3 view-modes -- it's the same place, just
// occasionally the multiverse lands somewhere coherent.
const GARDEN_POOL: UniverseDef[] = MISMATCHED_POOL.map((def) => ({
  ...def,
  id: `garden-${def.viewMode}`,
  isGarden: true,
  resourceKind: "petal",
}));

export function rollUniverse(): UniverseDef {
  const pool = Math.random() < GARDEN_CHANCE ? GARDEN_POOL : MISMATCHED_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
