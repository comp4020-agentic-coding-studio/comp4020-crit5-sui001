// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
//
// The scene is deliberately thin: themes.ts owns what a universe looks like,
// level.ts owns how one is laid out, and this file only turns a generated
// Level into game objects and runs the walk/grab loop over it.

import kaplay from "kaplay";
import type { GameObj, Vec2 } from "kaplay";
import { loadAssets } from "./assets";
import { maybeShowCheckpoint } from "./checkpoint";
import { growthScale } from "./growth";
import { renderHud } from "./hud";
import { ROAD_THICKNESS, generateLevel } from "./level";
import { playStinger, startScore, stopScore } from "./music";
import { isObstacleCleared } from "./rules";
import { sfx } from "./sfx";
import { state } from "./state";
import { type Theme, rollTheme } from "./themes";
import { upgradeLevel } from "./upgrades";

const k = kaplay({
  root: document.getElementById("game")!,
  width: 1280,
  height: 720,
  letterbox: true,
  stretch: true,
  crisp: true,
  global: false,
});

loadAssets(k);

const TILE = 16;
const SCALE = 3;
const TS = TILE * SCALE; // 48px on screen
const LEVEL_ROWS = 15; // 15 * 48 == 720, exactly one screen tall
const LEVEL_COLS = 64;

const WALK_SPEED = 155;
const SPEED_PER_UPGRADE = 22;
const SPEED_RAMP_PER_UNIVERSE = 6;
const SPEED_RAMP_CAP = 60;

// A pickup sits one tile off the road, so its vertical distance is fixed at
// 72px; the range therefore buys horizontal window, which is what the player
// actually experiences as "how long do I have to react".
const BASE_RANGE = 122;
const RANGE_PER_UPGRADE = 0.25;

const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 8;
const SPARE_PICKUPS = 4;

type Pickup = GameObj<any> & { taken: boolean };

k.scene("universe", (theme: Theme) => {
  state.theme = theme;
  state.paused = false;
  state.collected = 0;
  state.threshold = MIN_THRESHOLD + Math.floor(Math.random() * (MAX_THRESHOLD - MIN_THRESHOLD + 1));
  k.setBackground(...theme.bg);

  const level = generateLevel(theme, {
    cols: LEVEL_COLS,
    rows: LEVEL_ROWS,
    pickupTarget: state.threshold + SPARE_PICKUPS,
  });

  // --- static scenery -------------------------------------------------
  // Path tiles are opaque in every pack, so the road overwrites the ground
  // cell instead of stacking a second sprite on it -- half the objects.
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const i = row * level.cols + col;
      const onPath = level.path[i] !== null;
      const tint: [number, number, number] =
        onPath && theme.pathTint ? theme.pathTint : [255, 255, 255];
      k.add([
        k.sprite(theme.sheet, { frame: level.path[i] ?? level.ground[i] }),
        k.pos(col * TS, row * TS),
        k.scale(SCALE),
        k.color(tint[0], tint[1], tint[2]),
        k.z(0),
      ]);
    }
  }

  for (const prop of level.props) {
    for (let dy = 0; dy < prop.h; dy++) {
      for (let dx = 0; dx < prop.w; dx++) {
        k.add([
          k.sprite(theme.sheet, { frame: prop.tiles[dy * prop.w + dx] }),
          k.pos((prop.col + dx) * TS, (prop.row + dy) * TS),
          k.scale(SCALE),
          k.z(1),
        ]);
      }
    }
  }

  // --- the walking line -----------------------------------------------
  const route: Vec2[] = level.route.map((cell) =>
    k.vec2(cell.col * TS + TS / 2, cell.row * TS + (ROAD_THICKNESS * TS) / 2),
  );
  const worldWidth = level.cols * TS;

  const playerScale = SCALE * (0.8 + growthScale(state.growthLevel) * 0.4);
  const player = k.add([
    k.sprite(theme.sheet, { frame: theme.player }),
    k.pos(route[0]),
    k.anchor("center"),
    k.scale(playerScale),
    k.z(4),
    "player",
  ]);

  let segment = 0;
  let alongSegment = 0;

  // Returns true when the walk has run out of route.
  function advance(distance: number): boolean {
    let left = distance;
    while (left > 0) {
      if (segment >= route.length - 1) return true;
      const a = route[segment];
      const b = route[segment + 1];
      const length = a.dist(b);
      const remaining = length - alongSegment;
      if (left < remaining) {
        alongSegment += left;
        left = 0;
      } else {
        left -= remaining;
        segment++;
        alongSegment = 0;
      }
    }
    if (segment >= route.length - 1) return true;
    const a = route[segment];
    const b = route[segment + 1];
    player.pos = a.lerp(b, alongSegment / a.dist(b));
    return false;
  }

  // --- pickups ----------------------------------------------------------
  const pickups: Pickup[] = level.pickups.map(
    (pu) =>
      k.add([
        k.sprite(theme.sheet, { frame: pu.tile }),
        k.pos(pu.col * TS + TS / 2, pu.row * TS + TS / 2),
        k.anchor("center"),
        k.scale(SCALE),
        k.area(),
        k.z(3),
        "pickup",
        { taken: false },
      ]) as Pickup,
  );

  const range = BASE_RANGE * (1 + upgradeLevel(state, "pickupRadius") * RANGE_PER_UPGRADE);
  const grabsEverythingInRange = upgradeLevel(state, "universalResonance") > 0;
  let inRange: Pickup[] = [];

  function collect(pickup: Pickup): void {
    if (pickup.taken) return;
    pickup.taken = true;
    state.currency++;
    state.collected++;
    k.destroy(pickup);

    // Pitch climbs with progress, so the audio says how close the universe is
    // to done without any of the on-screen text the spec forbids.
    sfx(k, "pickup", Math.min(state.collected, state.threshold) * 110);
    renderHud(k, state);

    if (isObstacleCleared(state.collected, state.threshold)) finishUniverse();
  }

  function grab(): void {
    if (state.paused || inRange.length === 0) return;
    if (grabsEverythingInRange) {
      for (const pickup of [...inRange]) collect(pickup);
    } else {
      collect(inRange[0]);
    }
  }

  k.onKeyPress("space", grab);
  // Mouse works too. Two ways in means the mechanic is discoverable without a
  // line of text telling anyone which key to press.
  for (const pickup of pickups) {
    pickup.onClick(() => {
      if (!state.paused && inRange.includes(pickup)) collect(pickup);
    });
  }

  if (upgradeLevel(state, "autoCollector") > 0) {
    k.loop(1.1, () => {
      if (!state.paused && inRange.length > 0) collect(inRange[0]);
    });
  }

  // --- reach overlay ----------------------------------------------------
  // One object at the world origin with scale 1, so its onDraw works in plain
  // world coordinates. Rings mark what's reachable and a tether links it to
  // the character -- that pairing is the entire tutorial.
  k.add([
    k.pos(0, 0),
    k.z(6),
    {
      draw() {
        if (state.paused) return;
        const pulse = 0.5 + 0.5 * Math.sin(k.time() * 7);
        for (const pickup of inRange) {
          k.drawCircle({
            pos: pickup.pos,
            radius: 30 + pulse * 5,
            fill: false,
            outline: { color: k.rgb(255, 238, 120), width: 3 },
            opacity: 0.55 + pulse * 0.45,
          });
          k.drawLine({
            p1: player.pos,
            p2: pickup.pos,
            width: 2,
            color: k.rgb(255, 238, 120),
            opacity: 0.18 + pulse * 0.22,
          });
        }
      },
    },
  ]);

  // --- universe completion ---------------------------------------------
  let finished = false;
  function finishUniverse(): void {
    if (finished) return;
    finished = true;
    state.clearedUniverseCount++;
    state.growthLevel++;
    sfx(k, "clear");

    const jumpToNext = () => {
      state.paused = false;
      stopScore();
      sfx(k, "jump");
      k.go("universe", rollTheme());
    };
    if (!maybeShowCheckpoint(k, state, jumpToNext)) {
      state.paused = true;
      k.wait(0.6, jumpToNext);
    }
  }

  // --- run --------------------------------------------------------------
  renderHud(k, state);
  startScore(k, theme.sheet);
  playStinger(k, theme.sheet);

  const walkSpeed =
    WALK_SPEED +
    upgradeLevel(state, "walkSpeed") * SPEED_PER_UPGRADE +
    Math.min(state.clearedUniverseCount * SPEED_RAMP_PER_UNIVERSE, SPEED_RAMP_CAP);

  k.onUpdate(() => {
    if (state.paused) return;

    if (advance(walkSpeed * k.dt())) {
      // Ran the whole road without filling the pips. Loop it rather than dead
      // -end: the pickups you missed are still lying there, and there are
      // always more of them than the threshold needs.
      segment = 0;
      alongSegment = 0;
      player.pos = route[0];
    }

    inRange = pickups
      .filter((pickup) => !pickup.taken && pickup.exists() && player.pos.dist(pickup.pos) <= range)
      .sort((a, b) => player.pos.dist(a.pos) - player.pos.dist(b.pos));

    for (const pickup of pickups) {
      if (pickup.taken || !pickup.exists()) continue;
      const lit = inRange.includes(pickup);
      pickup.scale = k.vec2(SCALE * (lit ? 1 + 0.14 * Math.sin(k.time() * 9) : 1));
    }

    k.camPos(
      Math.min(Math.max(player.pos.x, k.width() / 2), worldWidth - k.width() / 2),
      k.height() / 2,
    );
  });
});

k.scene("ending", () => {
  state.ended = true;
  stopScore();
  k.setBackground(15, 15, 20);
  sfx(k, "settle");

  k.add([
    k.text("Flicker settled.", { size: 40 }),
    k.pos(k.width() / 2, k.height() / 2 - 70),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text(
      `${state.clearedUniverseCount} universe(s) held still long enough to count.\n${state.currency} sparks to show for it.`,
      { size: 22, width: k.width() - 220, align: "center" },
    ),
    k.pos(k.width() / 2, k.height() / 2 + 20),
    k.anchor("center"),
    k.fixed(),
    k.color(200, 200, 200),
  ]);
});

k.go("universe", rollTheme());
