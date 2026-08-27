import { describe, expect, it } from "vitest";
import { ROAD_THICKNESS, generateLevel } from "../level";
import { THEMES } from "../themes";

// These are invariants, not contract tests: the crit-5 spec says nothing about
// procedural generation. They exist because this prototype has already shipped
// two unwinnable-level bugs by hand -- pickups spawned inside a solid obstacle,
// and a walk that ran off the end of the world. Both were "the level generator
// produced a state the player cannot escape", and both were invisible to a
// typecheck. Everything below is that class of bug, made loud.

// Deterministic RNG so a failure is reproducible rather than a coin flip.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 64;
const ROWS = 15;
const PICKUP_TARGET = 12;
const SEEDS = [1, 7, 42, 1337, 90210];

function build(themeIndex: number, seed: number) {
  const theme = THEMES[themeIndex];
  return {
    theme,
    level: generateLevel(theme, {
      cols: COLS,
      rows: ROWS,
      pickupTarget: PICKUP_TARGET,
      random: mulberry32(seed),
    }),
  };
}

describe("theme definitions are structurally sound", () => {
  it.each(THEMES.map((t) => [t.id, t] as const))("%s has usable tile roles", (_id, theme) => {
    expect(theme.ground.length).toBeGreaterThan(0);
    expect(theme.path.length).toBeGreaterThan(0);
    expect(theme.props.length).toBeGreaterThan(0);
    expect(theme.pickups.length).toBeGreaterThan(0);

    const maxFrame = theme.cols * theme.rows - 1;
    const frames = [
      ...theme.ground,
      ...theme.path,
      ...theme.pickups,
      theme.player,
      ...theme.props.flatMap((p) => p.tiles),
    ];
    for (const frame of frames) {
      expect(frame, `${theme.id} references frame ${frame}`).toBeGreaterThanOrEqual(0);
      expect(frame, `${theme.id} references frame ${frame}`).toBeLessThanOrEqual(maxFrame);
    }
  });

  it.each(THEMES.map((t) => [t.id, t] as const))("%s props are rectangular", (_id, theme) => {
    for (const prop of theme.props) {
      expect(prop.w).toBeGreaterThan(0);
      expect(prop.tiles.length % prop.w, `prop ${prop.tiles.join(",")}`).toBe(0);
    }
  });
});

describe("every generated level is walkable end to end", () => {
  const cases = THEMES.flatMap((theme, i) => SEEDS.map((seed) => [theme.id, i, seed] as const));

  it.each(cases)("%s seed %s: route spans the level", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    expect(level.route[0].col).toBe(0);
    expect(level.route[level.route.length - 1].col).toBe(COLS - 1);
  });

  it.each(cases)("%s seed %s: route never teleports", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (let i = 1; i < level.route.length; i++) {
      const a = level.route[i - 1];
      const b = level.route[i];
      const step = Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
      expect(step, `jump between route[${i - 1}] and route[${i}]`).toBe(1);
    }
  });

  it.each(cases)("%s seed %s: route stays on road tiles", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (const cell of level.route) {
      expect(level.path[cell.row * COLS + cell.col]).not.toBeNull();
      expect(cell.row + ROAD_THICKNESS).toBeLessThanOrEqual(ROWS);
    }
  });
});

describe("every generated level is winnable", () => {
  const cases = THEMES.flatMap((theme, i) => SEEDS.map((seed) => [theme.id, i, seed] as const));

  it.each(cases)("%s seed %s: enough pickups to clear", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    expect(level.pickups.length).toBeGreaterThanOrEqual(PICKUP_TARGET);
  });

  it.each(cases)("%s seed %s: every pickup sits beside the road", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    const roadCols = new Map<number, number[]>();
    for (const cell of level.route) {
      const rows = roadCols.get(cell.col) ?? [];
      rows.push(cell.row);
      roadCols.set(cell.col, rows);
    }
    for (const pickup of level.pickups) {
      const rows = roadCols.get(pickup.col);
      expect(rows, `pickup at col ${pickup.col} has no road in its column`).toBeDefined();
      // Directly above the road, or directly below its far edge -- either way
      // one tile from the walking line, which is what puts it inside reach.
      const adjacent = (rows ?? []).some(
        (row) => pickup.row === row - 1 || pickup.row === row + ROAD_THICKNESS,
      );
      expect(adjacent, `pickup at ${pickup.col},${pickup.row} is not beside the road`).toBe(true);
    }
  });

  it.each(cases)("%s seed %s: nothing is buried under scenery", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    const occupied = new Set<string>();
    for (const prop of level.props) {
      for (let dy = 0; dy < prop.h; dy++) {
        for (let dx = 0; dx < prop.w; dx++) occupied.add(`${prop.col + dx},${prop.row + dy}`);
      }
    }
    for (const pickup of level.pickups) {
      expect(occupied.has(`${pickup.col},${pickup.row}`), "pickup under a prop").toBe(false);
    }
    for (const cell of level.route) {
      for (let t = 0; t < ROAD_THICKNESS; t++) {
        expect(occupied.has(`${cell.col},${cell.row + t}`), "prop on the road").toBe(false);
      }
    }
  });

  it.each(cases)("%s seed %s: props stay inside the level", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (const prop of level.props) {
      expect(prop.col).toBeGreaterThanOrEqual(0);
      expect(prop.row).toBeGreaterThanOrEqual(0);
      expect(prop.col + prop.w).toBeLessThanOrEqual(COLS);
      expect(prop.row + prop.h).toBeLessThanOrEqual(ROWS);
    }
  });
});

describe("generation is deterministic for a given seed", () => {
  it("same theme and seed produce an identical level", () => {
    const a = build(0, 12345).level;
    const b = build(0, 12345).level;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("different seeds produce different levels", () => {
    const a = build(0, 1).level;
    const b = build(0, 2).level;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
