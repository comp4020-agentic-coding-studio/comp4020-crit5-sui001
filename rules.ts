// Pure, framework-free game rules. No kaplay import here on purpose --
// spec/game.test.ts calls these directly with no DOM/canvas involved.

export function isObstacleCleared(resourcesCollected: number, threshold: number): boolean {
  return resourcesCollected >= threshold;
}

export function resourceCounts(resourceKind: string, acceptedKinds: readonly string[]): boolean {
  return acceptedKinds.includes(resourceKind);
}
