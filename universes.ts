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

const UNIVERSE_POOL: UniverseDef[] = [
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

export function rollUniverse(): UniverseDef {
  return UNIVERSE_POOL[Math.floor(Math.random() * UNIVERSE_POOL.length)];
}
