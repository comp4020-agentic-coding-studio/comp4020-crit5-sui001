// One universe definition per "jump". Each mismatched view-mode gets its own
// Kenney pack (chosen because every sprite is either individually named or
// listed in an XML atlas -- no pixel-coordinate guessing against a raw grid
// sheet, which the originally-scoped Roguelike/Isometric-Nature packs would
// have required). `*SpriteSize` is that sprite's native max dimension in px,
// used to normalize wildly different pack resolutions to a common on-screen
// size -- see spriteScale() in main.ts.

export type ViewMode = "topdown" | "platformer" | "diorama";

export interface UniverseDef {
  id: string;
  viewMode: ViewMode;
  isGarden: boolean;
  obstacleCount: number;
  resourceThreshold: number;
  resourceKind: string;
  playerSprite: string;
  playerSpriteSize: number;
  obstacleSprite: string;
  obstacleSpriteSize: number;
  resourceSprite: string;
  resourceSpriteSize: number;
}

// The rare "it goes right" universe.
const GARDEN_CHANCE = 0.2;

const MISMATCHED_POOL: UniverseDef[] = [
  {
    id: "topdown",
    viewMode: "topdown",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
    playerSprite: "ship",
    playerSpriteSize: 64,
    obstacleSprite: "meteor",
    obstacleSpriteSize: 64,
    resourceSprite: "star",
    resourceSpriteSize: 64,
  },
  {
    id: "platformer",
    viewMode: "platformer",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
    playerSprite: "beige",
    playerSpriteSize: 128,
    obstacleSprite: "rock",
    obstacleSpriteSize: 64,
    resourceSprite: "coin",
    resourceSpriteSize: 64,
  },
  {
    id: "diorama",
    viewMode: "diorama",
    isGarden: false,
    obstacleCount: 3,
    resourceThreshold: 3,
    resourceKind: "spark",
    playerSprite: "lightpost",
    playerSpriteSize: 244,
    obstacleSprite: "castleWall",
    obstacleSpriteSize: 244,
    resourceSprite: "banner",
    resourceSpriteSize: 244,
  },
];

// Garden can land on any of the 3 view-modes -- it's the same place, just
// occasionally the multiverse lands somewhere coherent. Reuses the beige
// humanoid (warm-tinted in main.ts) rather than each mode's own mismatched
// player sprite, since the garden is meant to read as one consistent spirit.
const GARDEN_POOL: UniverseDef[] = MISMATCHED_POOL.map((def) => ({
  ...def,
  id: `garden-${def.viewMode}`,
  isGarden: true,
  resourceKind: "petal",
  playerSprite: "beige",
  playerSpriteSize: 128,
  obstacleSprite: "tree",
  obstacleSpriteSize: 211,
  resourceSprite: "flower",
  resourceSpriteSize: 60,
}));

export function rollUniverse(): UniverseDef {
  const pool = Math.random() < GARDEN_CHANCE ? GARDEN_POOL : MISMATCHED_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
