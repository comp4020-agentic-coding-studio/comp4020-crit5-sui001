// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
import kaplay from "kaplay";
import { growthScale, growthTint } from "./growth";
import { isObstacleCleared } from "./rules";
import { state } from "./state";
import { rollUniverse, type UniverseDef } from "./universes";
import { VIEW_MODES } from "./view-modes";

const k = kaplay({
  root: document.getElementById("game")!,
  width: 800,
  height: 600,
  letterbox: true,
  crisp: true,
  global: false,
});

const PLAYER_SPEED = 120;
const OBSTACLE_SPACING = 200;
const PLAYER_START_X = 40;

k.scene("universe", (def: UniverseDef) => {
  const mode = VIEW_MODES[def.viewMode];
  k.setGravity(mode.gravity);

  state.universe = def;
  state.obstacleProgress = new Array(def.obstacleCount).fill(0);

  if (def.viewMode === "platformer") {
    k.add([
      k.rect(PLAYER_START_X + OBSTACLE_SPACING * (def.obstacleCount + 1), 40),
      k.pos(0, k.height() - 40),
      k.color(90, 140, 90),
      k.area(),
      k.body({ isStatic: true }),
      "ground",
    ]);
  }

  const tint = growthTint(state.growthLevel);

  const player = k.add([
    k.rect(24, 24),
    k.pos(PLAYER_START_X, mode.playerStartY(k)),
    k.anchor("center"),
    k.color(...tint),
    k.scale(growthScale(state.growthLevel)),
    k.area(),
    k.body(),
    "player",
  ]);

  mode.setupCamera(k, player);

  const obstacles: ReturnType<typeof k.add>[] = [];

  for (let i = 0; i < def.obstacleCount; i++) {
    const x = PLAYER_START_X + OBSTACLE_SPACING * (i + 1);
    const midY = mode.playerStartY(k);

    const obstacle = k.add([
      k.rect(20, 200),
      k.pos(x, midY),
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
        k.pos(x - 80 + r * 25, midY - 90 + (r % 2) * 180),
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
      state.growthLevel++;
      k.wait(0.5, () => k.go("universe", rollUniverse()));
    }
  });

  k.onUpdate(() => {
    if (state.paused) return;

    player.move(PLAYER_SPEED, 0);
    mode.steerInput(k, player);
  });
});

k.go("universe", rollUniverse());
