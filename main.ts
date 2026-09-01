// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
//
// The scene is deliberately thin: themes.ts owns what a universe looks like,
// modifiers.ts owns its twist, level.ts owns how one is laid out, combo.ts
// owns what a grab is worth and beat.ts owns when. This file turns a generated
// Level into game objects and runs the walk/grab loop over it.

import kaplay from "kaplay";
import type { GameObj, Vec2 } from "kaplay";
import { ABILITIES, tryTrigger } from "./abilities";
import { UI_FONT, loadAssets } from "./assets";
import { beatPhase, isOnBeat } from "./beat";
import { maybeShowCheckpoint } from "./checkpoint";
import { multiplierFor, resolveGrab } from "./combo";
import { fitCanvas } from "./fit-canvas";
import { growthScale } from "./growth";
import { renderHud } from "./hud";
import { ROAD_THICKNESS, generateLevel } from "./level";
import { type Modifier, resetModifierHistory, rollModifier } from "./modifiers";
import { playStinger, startScore, stopScore } from "./music";
import { closePause, isPauseOpen, showPause } from "./overlays";
import { CHAIN_LENGTH, DECOY_REVEAL, type PickupKind } from "./pickups";
import { progress, recordRun, recordUniverseCleared, unlockedThemeIds } from "./progress";
import { dailyKey, dailySeed, random as seededRandom, setSeed } from "./rng";
import { isObstacleCleared } from "./rules";
import { gradeFor, runScore } from "./score";
import { settings } from "./settings";
import { sfx } from "./sfx";
import { resetRun, state } from "./state";
import { type Theme, resetThemeHistory, rollTheme } from "./themes";
import { upgradeLevel } from "./upgrades";

const LOGICAL_WIDTH = 1280;
const LOGICAL_HEIGHT = 720;

const k = kaplay({
  root: document.getElementById("game")!,
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  letterbox: true,
  stretch: true,
  crisp: true,
  global: false,
});

fitCanvas(k.canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT);
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
const SPEED_PER_COMBO = 1.6;
const SPEED_COMBO_CAP = 70;

const BASE_RANGE = 122;
const RANGE_PER_UPGRADE = 0.25;

const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 8;

// --- chaser tuning -----------------------------------------------------
// The chaser has its own ABSOLUTE speed rather than a fixed creep, so the gap
// closes at (chaserSpeed - yourSpeed). That is what makes Faster Walk Speed a
// real purchase: at Lv0 you are slower than it and losing ground no matter how
// well you play, and it takes two levels to out-walk it outright.
const CHASE_BASE_SPEED = 192;
const CHASE_RAMP_PER_UNIVERSE = 5;
const CHASE_RAMP_CAP = 50;
const CHASE_START_GAP = 430;
const CHASE_MAX_GAP = 560;
const CHASE_GAIN_ON_GRAB = 52;
const CHASE_LOSS_ON_MISS = 78;
const CHASE_LOSS_ON_HARM = 120;
const CHASE_RESET_ON_CATCH = 370;
// It eats what you left behind, so a miss costs the pickup as well as ground.
const CHASE_EAT_RADIUS = 44;
// It cuts the corner while you take the scenic route.
const CHASE_BRANCH_PRESSURE = 26;
// And it leans on a hot streak, cancelling part of the speed a streak buys.
const CHASE_PER_COMBO = 0.9;
const CHASE_COMBO_CAP = 45;

// --- the run for the exit ----------------------------------------------
// Filling the pips no longer ends a universe. It starts a final stretch you
// have to survive, which gives every universe a shape -- build, then climax --
// instead of stopping the instant the last pip lands.
const ESCAPE_DISTANCE = 900;
const ESCAPE_SPEED = 1.28;
const ESCAPE_CHASER_BONUS = 30;
const ESCAPE_SURGE = 140;

const BLINK_DISTANCE = 260;
const DRAG_SPEED = 0.55;
const DRAG_COST_PER_SECOND = 2.2;

type Pickup = GameObj<any> & {
  taken: boolean;
  kind: PickupKind;
  harmful: boolean;
  chainId?: number;
  chainIndex?: number;
};

k.scene("universe", (theme: Theme) => {
  const modifier: Modifier = rollModifier();
  state.theme = theme;
  state.modifier = modifier;
  state.paused = false;
  state.collected = 0;
  state.combo = 0;
  state.threat = 0;
  state.escaping = false;
  state.escape = 0;
  // Seeded, like everything else that shapes a universe -- otherwise two
  // players on the same daily seed would get different pip counts.
  state.threshold =
    MIN_THRESHOLD + Math.floor(seededRandom() * (MAX_THRESHOLD - MIN_THRESHOLD + 1));
  k.setBackground(...theme.bg);

  const level = generateLevel(theme, {
    cols: LEVEL_COLS,
    rows: LEVEL_ROWS,
    pickupTarget: state.threshold + 3,
    hazardBias: modifier.hazardBias,
    pickupScale: modifier.pickupScale,
    inverted: modifier.inverted,
  });

  // --- static scenery -------------------------------------------------
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

  // --- the walk graph ---------------------------------------------------
  const nodePos: Vec2[] = level.nodes.map((node) =>
    k.vec2(node.col * TS + TS / 2, node.row * TS + (ROAD_THICKNESS * TS) / 2),
  );
  const worldWidth = level.cols * TS;
  const spineLength = level.route.length;

  const playerScale = SCALE * (0.8 + growthScale(state.growthLevel) * 0.4);
  const player = k.add([
    k.sprite(theme.sheet, { frame: theme.player }),
    k.pos(nodePos[0]),
    k.anchor("center"),
    k.scale(playerScale),
    k.z(5),
    "player",
  ]);

  // The chaser is the player's own sprite, darkened. No new art had to be
  // chosen for it, and "the thing behind you looks like you" fits a game about
  // flickering between universes better than a borrowed monster would.
  const chaser = k.add([
    k.sprite(theme.sheet, { frame: theme.player }),
    k.pos(nodePos[0]),
    k.anchor("center"),
    k.scale(playerScale * 1.12),
    k.color(70, 30, 55),
    k.opacity(0.85),
    k.z(4),
  ]);

  let atNode = 0;
  let toNode = level.nodes[0].next[0] ?? 0;
  let alongEdge = 0;
  let travelled = 0;
  let chaseGap = CHASE_START_GAP;
  let escaping = false;
  let escapeLeft = 0;
  let dragDebt = 0;

  const trail: Array<{ pos: Vec2; dist: number }> = [{ pos: nodePos[0], dist: 0 }];

  function steerDirection(): number {
    if (k.isKeyDown("up") || k.isKeyDown("w")) return -1;
    if (k.isKeyDown("down") || k.isKeyDown("s")) return 1;
    return 0;
  }

  function chooseNext(from: number): number | null {
    const options = level.nodes[from].next;
    if (options.length === 0) return null;
    if (options.length === 1) return options[0];
    const steer = steerDirection();
    if (steer === 0) return options[0];
    return options.reduce((best, option) =>
      steer < 0
        ? level.nodes[option].row < level.nodes[best].row
          ? option
          : best
        : level.nodes[option].row > level.nodes[best].row
          ? option
          : best,
    );
  }

  /** Returns true when the walk has run out of road. */
  function advance(distance: number): boolean {
    let left = distance;
    while (left > 0) {
      const a = nodePos[atNode];
      const b = nodePos[toNode];
      const length = a.dist(b);
      if (length === 0) {
        const next = chooseNext(toNode);
        if (next === null) return true;
        atNode = toNode;
        toNode = next;
        continue;
      }
      const remaining = length - alongEdge;
      if (left < remaining) {
        alongEdge += left;
        travelled += left;
        left = 0;
      } else {
        left -= remaining;
        travelled += remaining;
        atNode = toNode;
        alongEdge = 0;
        const next = chooseNext(atNode);
        if (next === null) return true;
        toNode = next;
      }
    }
    const a = nodePos[atNode];
    const b = nodePos[toNode];
    player.pos = a.lerp(b, alongEdge / Math.max(a.dist(b), 0.0001));
    return false;
  }

  function restartWalk(): void {
    atNode = 0;
    toNode = level.nodes[0].next[0] ?? 0;
    alongEdge = 0;
    player.pos = nodePos[0];
    trail.length = 0;
    trail.push({ pos: nodePos[0], dist: travelled });
  }

  // --- pickups ----------------------------------------------------------
  const SAFE_TINT: [number, number, number] = [255, 255, 255];
  const HARM_TINT: [number, number, number] = [232, 48, 48];

  const pickups: Pickup[] = level.pickups.map((pu) => {
    const disguised = pu.kind === "decoy";
    const tint = pu.harmful && !disguised ? HARM_TINT : SAFE_TINT;
    return k.add([
      k.sprite(theme.sheet, { frame: pu.tile }),
      k.pos(pu.col * TS + TS / 2, pu.row * TS + TS / 2),
      k.anchor("center"),
      k.scale(SCALE),
      k.color(tint[0], tint[1], tint[2]),
      k.area(),
      k.z(3),
      "pickup",
      {
        taken: false,
        kind: pu.kind,
        harmful: pu.harmful,
        ...(pu.chainId !== undefined ? { chainId: pu.chainId, chainIndex: pu.chainIndex } : {}),
      },
    ]) as Pickup;
  });

  const range =
    BASE_RANGE * (1 + upgradeLevel(state, "pickupRadius") * RANGE_PER_UPGRADE) * modifier.reachScale;
  const grabsEverythingInRange = upgradeLevel(state, "universalResonance") > 0;
  let inRange: Pickup[] = [];
  let wasInRange = new Set<Pickup>();
  let flashUntil = 0;

  const chainProgress = new Map<number, number>();

  function collect(pickup: Pickup): void {
    if (pickup.taken) return;
    pickup.taken = true;
    k.destroy(pickup);

    let chainCompleted = false;
    if (pickup.chainId !== undefined && pickup.chainIndex !== undefined) {
      const expected = chainProgress.get(pickup.chainId) ?? 0;
      if (pickup.chainIndex === expected) {
        const next = expected + 1;
        chainProgress.set(pickup.chainId, next);
        chainCompleted = next === CHAIN_LENGTH;
      } else {
        chainProgress.set(pickup.chainId, 0);
      }
    }

    const onBeat = isOnBeat(k.time());
    const outcome = resolveGrab(
      { combo: state.combo, bestCombo: state.bestCombo },
      {
        kind: pickup.kind,
        harmful: pickup.harmful,
        onBeat,
        chainCompleted,
        sparkScale: modifier.sparkScale,
      },
    );
    state.combo = outcome.combo;
    state.bestCombo = outcome.bestCombo;
    // Sparks land in the pending pile, not the bank. Clearing the universe
    // keeps them; the chaser takes them. A penalty bigger than the pile spills
    // into the bank, so a hazard always stings even on a fresh universe.
    const after = state.pending + outcome.sparks;
    if (after >= 0) {
      state.pending = after;
    } else {
      state.pending = 0;
      state.currency = Math.max(0, state.currency + after);
    }
    if (outcome.counted) state.collected++;
    if (outcome.counted && onBeat) state.perfectBeats++;

    if (pickup.harmful) {
      chaseGap -= CHASE_LOSS_ON_HARM;
      if (!settings.reducedMotion) k.shake(11);
      sfx(k, "thud");
      sfx(k, "bounce");
    } else if (outcome.fizzled) {
      sfx(k, "bounce", -300);
    } else {
      chaseGap = Math.min(CHASE_MAX_GAP, chaseGap + CHASE_GAIN_ON_GRAB);
      flashUntil = k.time() + (chainCompleted ? 0.3 : 0.12);
      sfx(k, "pickup", (outcome.multiplier - 1) * 170 + (onBeat ? 200 : 0));
      if (chainCompleted) sfx(k, "clear");
    }

    refreshHud();
    if (outcome.counted && isObstacleCleared(state.collected, state.threshold)) startEscape();
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
  for (const pickup of pickups) {
    pickup.onClick(() => {
      if (!state.paused && inRange.includes(pickup)) collect(pickup);
    });
  }

  if (upgradeLevel(state, "autoCollector") > 0) {
    k.loop(1.1, () => {
      if (state.paused || !settings.autoCollect) return;
      const target = inRange.find((pickup) => {
        if (settings.autoTarget === "all") return true;
        return settings.autoTarget === "harmful" ? pickup.harmful : !pickup.harmful;
      });
      if (target) collect(target);
    });
  }

  // --- active abilities --------------------------------------------------
  const blinkDef = ABILITIES.find((a) => a.id === "blink")!;
  const purgeDef = ABILITIES.find((a) => a.id === "purge")!;

  k.onKeyPress("q", () => {
    if (state.paused || upgradeLevel(state, "blink") === 0) return;
    if (!tryTrigger(state.cooldowns, blinkDef, k.time())) return;
    // The gap grows by exactly what you skipped, so the chaser stays put while
    // you jump -- otherwise it would ride the trail forward with you and the
    // ability would do nothing at all.
    advance(BLINK_DISTANCE);
    chaseGap = Math.min(CHASE_MAX_GAP, chaseGap + BLINK_DISTANCE);
    flashUntil = k.time() + 0.2;
    sfx(k, "jump");
    refreshHud();
  });

  k.onKeyPress("e", () => {
    if (state.paused || upgradeLevel(state, "purge") === 0) return;
    if (!tryTrigger(state.cooldowns, purgeDef, k.time())) return;
    let cleared = 0;
    for (const pickup of inRange) {
      if (!pickup.harmful || pickup.taken) continue;
      pickup.taken = true;
      k.destroy(pickup);
      state.hazardsDodged++;
      cleared++;
    }
    sfx(k, cleared > 0 ? "clear" : "bounce", cleared > 0 ? 0 : -400);
    if (!settings.reducedMotion && cleared > 0) k.shake(6);
    refreshHud();
  });

  function dragging(): boolean {
    return (
      upgradeLevel(state, "drag") > 0 &&
      state.pending > 0 &&
      (k.isKeyDown("shift") || k.isKeyDown("left shift"))
    );
  }

  // --- reach overlay ----------------------------------------------------
  k.add([
    k.pos(0, 0),
    k.z(7),
    {
      draw() {
        if (state.paused) return;
        const swell = 1 - beatPhase(k.time());
        for (const pickup of inRange) {
          const revealed =
            pickup.kind !== "decoy" || player.pos.dist(pickup.pos) <= range * DECOY_REVEAL;
          const danger = pickup.harmful && revealed;
          const gem = pickup.kind === "beatGem";
          const colour = danger
            ? k.rgb(255, 90, 90)
            : gem
              ? k.rgb(150, 220, 255)
              : k.rgb(255, 238, 120);
          k.drawCircle({
            pos: pickup.pos,
            radius: (danger ? 26 : 30) + swell * 7,
            fill: false,
            outline: { color: colour, width: danger ? 4 : 3 },
            // A beat gem's ring only brightens ON the beat, which is the whole
            // instruction for it.
            opacity: gem ? 0.15 + swell * 0.85 : 0.45 + swell * 0.55,
          });
          k.drawLine({
            p1: player.pos,
            p2: pickup.pos,
            width: 2,
            color: colour,
            opacity: danger ? 0.12 : 0.18 + swell * 0.24,
          });
        }
        if (k.time() < flashUntil) {
          k.drawCircle({
            pos: player.pos,
            radius: 46,
            fill: false,
            outline: { color: k.rgb(255, 255, 200), width: 4 },
            opacity: 0.8,
          });
        }
      },
    },
  ]);

  // --- pause ------------------------------------------------------------
  function refreshHud(): void {
    renderHud(k, state, openPause);
  }

  function openPause(): void {
    if (state.paused) return;
    state.paused = true;
    showPause(
      k,
      () => {
        state.paused = false;
      },
      () => {
        state.paused = false;
        stopScore();
        k.go("ending");
      },
    );
  }

  k.onKeyPress("escape", () => {
    if (state.paused && isPauseOpen(k)) {
      closePause(k);
      state.paused = false;
    } else if (!state.paused) {
      openPause();
    }
  });

  // --- the run for the exit ---------------------------------------------
  function startEscape(): void {
    if (escaping || finished) return;
    escaping = true;
    state.escaping = true;
    escapeLeft = ESCAPE_DISTANCE;
    state.escape = 0;
    chaseGap = Math.max(90, chaseGap - ESCAPE_SURGE);
    sfx(k, "clear");
    refreshHud();
  }

  let finished = false;
  function finishUniverse(): void {
    if (finished) return;
    finished = true;
    escaping = false;
    state.escaping = false;
    state.clearedUniverseCount++;
    state.growthLevel++;
    // Banking: everything earned in here is now safe.
    state.currency += state.pending;
    state.pending = 0;
    recordUniverseCleared();
    sfx(k, "clear");
    refreshHud();

    const jumpToNext = () => {
      state.paused = false;
      stopScore();
      sfx(k, "jump");
      k.go("universe", rollTheme(unlockedThemeIds()));
    };
    if (!maybeShowCheckpoint(k, state, jumpToNext)) {
      state.paused = true;
      k.wait(0.6, jumpToNext);
    }
  }

  // --- run --------------------------------------------------------------
  refreshHud();
  if (!modifier.silent) {
    startScore(k, theme.sheet);
    playStinger(k, theme.sheet);
  } else {
    stopScore();
  }

  const baseSpeed =
    (WALK_SPEED +
      upgradeLevel(state, "walkSpeed") * SPEED_PER_UPGRADE +
      Math.min(state.clearedUniverseCount * SPEED_RAMP_PER_UNIVERSE, SPEED_RAMP_CAP)) *
    modifier.speedScale;
  const chaserBase =
    CHASE_BASE_SPEED +
    Math.min(state.clearedUniverseCount * CHASE_RAMP_PER_UNIVERSE, CHASE_RAMP_CAP);

  k.onUpdate(() => {
    if (state.paused) return;

    let speed = baseSpeed + Math.min(state.combo * SPEED_PER_COMBO, SPEED_COMBO_CAP);
    if (escaping) speed *= ESCAPE_SPEED;
    if (dragging()) {
      speed *= DRAG_SPEED;
      dragDebt += DRAG_COST_PER_SECOND * k.dt();
      if (dragDebt >= 1) {
        const spend = Math.floor(dragDebt);
        dragDebt -= spend;
        state.pending = Math.max(0, state.pending - spend);
        refreshHud();
      }
    }

    const step = speed * k.dt();
    if (advance(step)) restartWalk();
    trail.push({ pos: player.pos, dist: travelled });

    if (escaping) {
      escapeLeft -= step;
      state.escape = 1 - Math.max(0, escapeLeft) / ESCAPE_DISTANCE;
      if (escapeLeft <= 0) {
        finishUniverse();
        return;
      }
    }

    // --- chaser -------------------------------------------------------
    const chaserSpeed =
      chaserBase +
      Math.min(state.combo * CHASE_PER_COMBO, CHASE_COMBO_CAP) +
      (escaping ? ESCAPE_CHASER_BONUS : 0);
    chaseGap += (speed - chaserSpeed) * k.dt();
    // Taking the scenic route means it cuts the corner while you walk the long
    // way round -- the price of the greedy strand, paid in ground.
    if (atNode >= spineLength) chaseGap -= CHASE_BRANCH_PRESSURE * k.dt();
    chaseGap = Math.min(chaseGap, CHASE_MAX_GAP);

    if (chaseGap <= 0) {
      chaseGap = CHASE_RESET_ON_CATCH;
      state.combo = 0;
      // The pending pile is what it takes. That is the whole push-your-luck
      // decision: a fat streak is something you are carrying, not something
      // you already have.
      state.pending = 0;
      if (!settings.reducedMotion) k.shake(20);
      sfx(k, "bounce");
      refreshHud();
    }
    const chaseTarget = travelled - chaseGap;
    while (trail.length > 2 && trail[1].dist < chaseTarget) trail.shift();
    chaser.pos = trail[0].pos;
    chaser.opacity = 0.5 + 0.45 * (1 - Math.min(chaseGap / CHASE_MAX_GAP, 1));
    state.threat = 1 - Math.min(chaseGap / CHASE_MAX_GAP, 1);

    // It eats what you walked past, so a miss costs the pickup too and a
    // second lap does not hand it back.
    for (const pickup of pickups) {
      if (pickup.taken || !pickup.exists() || pickup.harmful) continue;
      if (chaser.pos.dist(pickup.pos) <= CHASE_EAT_RADIUS) {
        pickup.taken = true;
        k.destroy(pickup);
        sfx(k, "thud", -500);
      }
    }

    // --- reach ---------------------------------------------------------
    inRange = pickups
      .filter((pickup) => !pickup.taken && pickup.exists() && player.pos.dist(pickup.pos) <= range)
      .sort((a, b) => player.pos.dist(a.pos) - player.pos.dist(b.pos));

    const nowInRange = new Set(inRange);
    for (const pickup of wasInRange) {
      if (!nowInRange.has(pickup) && !pickup.taken && pickup.exists()) {
        if (pickup.harmful) state.hazardsDodged++;
        else chaseGap -= CHASE_LOSS_ON_MISS;
      }
    }
    wasInRange = nowInRange;

    for (const pickup of pickups) {
      if (pickup.taken || !pickup.exists()) continue;
      const lit = nowInRange.has(pickup);
      const pulse = lit ? 1 + 0.16 * (1 - beatPhase(k.time())) : 1;
      pickup.scale = k.vec2(SCALE * pulse);
      if (pickup.kind === "decoy" && player.pos.dist(pickup.pos) <= range * DECOY_REVEAL) {
        pickup.color = k.rgb(HARM_TINT[0], HARM_TINT[1], HARM_TINT[2]);
      }
    }

    k.camPos(
      Math.min(Math.max(player.pos.x, k.width() / 2), worldWidth - k.width() / 2),
      k.height() / 2,
    );
  });
});

function beginRun(seed: number, label: string): void {
  resetRun();
  resetThemeHistory();
  resetModifierHistory();
  setSeed(seed);
  state.seedLabel = label;
  k.go("universe", rollTheme(unlockedThemeIds()));
}

k.scene("title", () => {
  stopScore();
  k.setBackground(14, 16, 24);

  k.add([
    k.text("FLICKER", { size: 64, font: UI_FONT }),
    k.pos(k.width() / 2, 150),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 238, 150),
  ]);

  k.add([
    k.text("ten universes, none of them yours", { size: 20, font: UI_FONT }),
    k.pos(k.width() / 2, 200),
    k.anchor("center"),
    k.fixed(),
    k.color(170, 178, 196),
  ]);

  const stats =
    progress.runs === 0
      ? "no runs yet"
      : [
          `${progress.runs} run(s)`,
          `best ${progress.bestScore} (${gradeFor(progress.bestScore)})`,
          `longest streak ${progress.bestStreak}`,
          `${progress.unlocked.length}/10 universes found`,
        ].join("   ");

  k.add([
    k.text(stats, { size: 17, font: UI_FONT }),
    k.pos(k.width() / 2, 250),
    k.anchor("center"),
    k.fixed(),
    k.color(140, 150, 170),
  ]);

  const buttons: Array<{ label: string; sub: string; colour: [number, number, number]; act: () => void }> = [
    {
      label: "begin",
      sub: "a fresh multiverse",
      colour: [70, 120, 80],
      act: () => beginRun(Math.floor(Math.random() * 0xffffffff), ""),
    },
    {
      // Same seed for everyone, all day: the levels are identical, so scores
      // are actually comparable and a pod has something to argue about.
      label: "today's run",
      sub: dailyKey(new Date()),
      colour: [72, 92, 140],
      act: () => beginRun(dailySeed(new Date()), dailyKey(new Date())),
    },
  ];

  buttons.forEach((button, i) => {
    const w = 280;
    const h = 74;
    const x = k.width() / 2 + (i === 0 ? -w - 14 : 14);
    const y = 340;

    const btn = k.add([k.rect(w, h), k.pos(x, y), k.color(...button.colour), k.area(), k.fixed()]);
    k.add([
      k.text(button.label, { size: 24, font: UI_FONT }),
      k.pos(x + w / 2, y + 26),
      k.anchor("center"),
      k.fixed(),
      k.color(255, 255, 255),
    ]);
    k.add([
      k.text(button.sub, { size: 14, font: UI_FONT }),
      k.pos(x + w / 2, y + 52),
      k.anchor("center"),
      k.fixed(),
      k.color(200, 210, 225),
    ]);
    btn.onClick(button.act);
  });

  // A title screen also solves the autoplay problem for free: browsers refuse
  // audio until the page has seen a real gesture, and this is that gesture.
  const quickStart = () => beginRun(Math.floor(Math.random() * 0xffffffff), "");
  k.onKeyPress("space", quickStart);
  k.onKeyPress("enter", quickStart);
});

k.scene("ending", () => {
  state.ended = true;
  stopScore();
  k.setBackground(15, 15, 20);
  sfx(k, "settle");

  const totals = {
    currency: state.currency,
    bestCombo: state.bestCombo,
    clearedUniverseCount: state.clearedUniverseCount,
    perfectBeats: state.perfectBeats,
    hazardsDodged: state.hazardsDodged,
  };
  const score = runScore(totals);
  const grade = gradeFor(score);
  const isBest = score > progress.bestScore;
  recordRun(totals);

  k.add([
    k.text("Flicker settled.", { size: 34, font: UI_FONT }),
    k.pos(k.width() / 2, 120),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text(`${score}`, { size: 76, font: UI_FONT }),
    k.pos(k.width() / 2 - 60, 210),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 238, 150),
  ]);
  k.add([
    k.text(grade, { size: 76, font: UI_FONT }),
    k.pos(k.width() / 2 + 110, 210),
    k.anchor("center"),
    k.fixed(),
    k.color(grade === "S" ? 255 : 170, grade === "S" ? 200 : 200, grade === "S" ? 90 : 230),
  ]);

  if (isBest) {
    k.add([
      k.text("a personal best", { size: 18, font: UI_FONT }),
      k.pos(k.width() / 2, 262),
      k.anchor("center"),
      k.fixed(),
      k.color(255, 210, 120),
    ]);
  }

  const lines = [
    `${state.clearedUniverseCount} universe(s) held still long enough to count.`,
    `${state.currency} sparks banked${state.pending > 0 ? `, ${state.pending} left behind` : ""}.`,
    `Best streak ${state.bestCombo} (x${multiplierFor(state.bestCombo)}).`,
    `${state.perfectBeats} on the beat, ${state.hazardsDodged} let go by.`,
    state.seedLabel ? `today's run -- ${state.seedLabel}` : "",
  ].filter(Boolean);

  k.add([
    k.text(lines.join("\n"), {
      size: 19,
      font: UI_FONT,
      width: k.width() - 220,
      align: "center",
      lineSpacing: 8,
    }),
    k.pos(k.width() / 2, 400),
    k.anchor("center"),
    k.fixed(),
    k.color(200, 200, 200),
  ]);

  const w = 240;
  const h = 58;
  const x = k.width() / 2 - w / 2;
  const y = 560;
  const btn = k.add([k.rect(w, h), k.pos(x, y), k.color(70, 100, 130), k.area(), k.fixed()]);
  k.add([
    k.text("again", { size: 21, font: UI_FONT }),
    k.pos(x + w / 2, y + h / 2),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
  ]);
  btn.onClick(() => k.go("title"));
  k.onKeyPress("space", () => k.go("title"));
});

k.go("title");
