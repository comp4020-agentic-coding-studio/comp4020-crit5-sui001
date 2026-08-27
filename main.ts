// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
import kaplay from "kaplay";
import { maybeShowCheckpoint } from "./checkpoint";
import { growthScale, growthTint } from "./growth";
import { renderHud } from "./hud";
import { isObstacleCleared, resourceCounts } from "./rules";
import { state } from "./state";
import { rollUniverse, type UniverseDef } from "./universes";
import { upgradeLevel } from "./upgrades";
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
  const [bgR, bgG, bgB] = def.isGarden ? [40, 60, 40] : [20, 20, 30];
  k.setBackground(bgR, bgG, bgB);

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

  const tint = growthTint(state.growthLevel, def.isGarden);
  const pickupScale = 1 + upgradeLevel(state, "pickupRadius") * 0.25;
  const walkSpeed = PLAYER_SPEED + upgradeLevel(state, "walkSpeed") * 20;

  const player = k.add([
    k.rect(24, 24),
    k.pos(PLAYER_START_X, mode.playerStartY(k)),
    k.anchor("center"),
    k.color(...tint),
    k.scale(growthScale(state.growthLevel)),
    k.area({ scale: pickupScale }),
    k.body(),
    "player",
  ]);

  mode.setupCamera(k, player);
  renderHud(k, state);

  const obstacles: ReturnType<typeof k.add>[] = [];

  for (let i = 0; i < def.obstacleCount; i++) {
    const x = PLAYER_START_X + OBSTACLE_SPACING * (i + 1);
    const midY = mode.playerStartY(k);

    const [obsR, obsG, obsB] = def.isGarden ? [90, 160, 90] : [200, 80, 80];
    const obstacle = k.add([
      k.rect(20, 200),
      k.pos(x, midY),
      k.anchor("center"),
      k.color(obsR, obsG, obsB),
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
        { obstacleIndex: i, kind: def.resourceKind },
      ]);
    }
  }

  type Resource = ReturnType<typeof k.add> & { obstacleIndex: number; kind: string };

  function collectResource(resource: Resource) {
    const acceptsAnyKind = upgradeLevel(state, "universalResonance") > 0;
    if (!acceptsAnyKind && !resourceCounts(resource.kind, [def.resourceKind])) return;

    const idx = resource.obstacleIndex;
    state.currency++;
    state.obstacleProgress[idx]++;
    k.destroy(resource);

    if (isObstacleCleared(state.obstacleProgress[idx], def.resourceThreshold)) {
      const obstacle = obstacles[idx];
      if (obstacle.exists()) k.destroy(obstacle);
    }

    renderHud(k, state);

    if (state.obstacleProgress.every((n) => isObstacleCleared(n, def.resourceThreshold))) {
      state.clearedUniverseCount++;
      state.growthLevel++;

      const jumpToNext = () => k.go("universe", rollUniverse());
      if (!maybeShowCheckpoint(k, state, jumpToNext)) {
        k.wait(0.5, jumpToNext);
      }
    }
  }

  k.onCollide("player", "resource", (_player, resource) => {
    collectResource(resource as unknown as Resource);
  });

  if (upgradeLevel(state, "autoCollector") > 0) {
    const AUTO_COLLECT_RANGE = 60;
    k.loop(1, () => {
      const nearest = k
        .get("resource")
        .filter((r) => player.pos.dist(r.pos) <= AUTO_COLLECT_RANGE)
        .sort((a, b) => player.pos.dist(a.pos) - player.pos.dist(b.pos))[0];
      if (nearest) collectResource(nearest as unknown as Resource);
    });
  }

  k.onUpdate(() => {
    if (state.paused) return;

    player.move(walkSpeed, 0);
    mode.steerInput(k, player);
  });
});

k.scene("ending", () => {
  state.ended = true;
  k.setBackground(15, 15, 20);

  k.add([
    k.text("Flicker settled.", { size: 28 }),
    k.pos(k.width() / 2, k.height() / 2 - 50),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text(
      `${state.clearedUniverseCount} universe(s) held still long enough to count.\n${state.currency} sparks to show for it.`,
      { size: 16, width: k.width() - 160, align: "center" },
    ),
    k.pos(k.width() / 2, k.height() / 2 + 10),
    k.anchor("center"),
    k.fixed(),
    k.color(200, 200, 200),
  ]);
});

k.go("universe", rollUniverse());
