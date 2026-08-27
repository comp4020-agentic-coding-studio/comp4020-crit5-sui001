// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
import kaplay from "kaplay";
import { isObstacleCleared } from "./rules";
import { state } from "./state";
import { rollUniverse, type UniverseDef } from "./universes";

const k = kaplay({
  root: document.getElementById("game")!,
  width: 800,
  height: 600,
  letterbox: true,
  crisp: true,
  global: false,
});

const PLAYER_SPEED = 120;
const LATERAL_SPEED = 160;
const OBSTACLE_SPACING = 200;
const PLAYER_START_X = 40;

k.scene("universe", (def: UniverseDef) => {
  k.setGravity(0);

  state.universe = def;
  state.obstacleProgress = new Array(def.obstacleCount).fill(0);

  const player = k.add([
    k.rect(24, 24),
    k.pos(PLAYER_START_X, k.height() / 2),
    k.anchor("center"),
    k.color(120, 200, 255),
    k.area(),
    k.body(),
    "player",
  ]);

  const obstacles: ReturnType<typeof k.add>[] = [];

  for (let i = 0; i < def.obstacleCount; i++) {
    const x = PLAYER_START_X + OBSTACLE_SPACING * (i + 1);

    const obstacle = k.add([
      k.rect(20, 200),
      k.pos(x, k.height() / 2),
      k.anchor("center"),
      k.color(200, 80, 80),
      k.area(),
      k.body({ isStatic: true }),
      "obstacle",
      { obstacleIndex: i },
    ]);
    obstacles.push(obstacle);

    for (let r = 0; r < def.resourceThreshold + 1; r++) {
      k.add([
        k.rect(10, 10),
        k.pos(x - 80 + r * 25, k.height() / 2 - 90 + (r % 2) * 180),
        k.anchor("center"),
        k.color(255, 220, 100),
        k.area(),
        "resource",
        { obstacleIndex: i },
      ]);
    }
  }

  k.onCollide("player", "resource", (_player, resource) => {
    const idx = (resource as unknown as { obstacleIndex: number }).obstacleIndex;

    state.currency++;
    state.obstacleProgress[idx]++;
    k.destroy(resource);

    if (isObstacleCleared(state.obstacleProgress[idx], def.resourceThreshold)) {
      const obstacle = obstacles[idx];
      if (obstacle.exists()) k.destroy(obstacle);
    }

    if (state.obstacleProgress.every((n) => isObstacleCleared(n, def.resourceThreshold))) {
      state.clearedUniverseCount++;
      k.wait(0.5, () => k.go("universe", rollUniverse()));
    }
  });

  k.onUpdate(() => {
    if (state.paused) return;

    player.move(PLAYER_SPEED, 0);
    if (k.isKeyDown("up")) player.move(0, -LATERAL_SPEED);
    if (k.isKeyDown("down")) player.move(0, LATERAL_SPEED);
  });
});

k.go("universe", rollUniverse());
