import { describe, expect, it } from "vitest";
import { ROAD_THICKNESS, generateLevel } from "../level";
import { THEMES } from "../themes";

// These are invariants, not contract tests: the crit-5 spec says nothing about
// procedural generation. They exist because this prototype has already shipped
// two unwinnable-level bugs by hand -- pickups spawned inside a solid obstacle,
// and a walk that ran off the end of the world. Both were "the generator
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
const PICKUP_TARGET = 10;
const SEEDS = [1, 7, 42, 1337, 90210];
const CASES = THEMES.flatMap((theme, i) => SEEDS.map((seed) => [theme.id, i, seed] as const));

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

describe("the spine is a walkable line", () => {
  it.each(CASES)("%s seed %s: spans the level", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    expect(level.route[0].col).toBe(0);
    expect(level.route[level.route.length - 1].col).toBe(COLS - 1);
  });

  it.each(CASES)("%s seed %s: never teleports", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (let i = 1; i < level.route.length; i++) {
      const a = level.route[i - 1];
      const b = level.route[i];
      expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
    }
  });
});

describe("the fork graph always terminates", () => {
  // Every steering policy has to reach the end. A branch that looped, or one
  // that rejoined behind where it split, would strand the player walking
  // forever with no way to finish -- exactly the "fell forever" bug in a new
  // costume.
  const policies: Array<[string, (options: number[]) => number]> = [
    ["always spine", (options) => options[0]],
    ["always branch", (options) => options[options.length - 1]],
  ];

  it.each(
    CASES.flatMap(([id, i, seed]) => policies.map(([name, choose]) => [id, i, seed, name, choose] as const)),
  )("%s seed %s: %s reaches the end", (_id, themeIndex, seed, _policy, choose) => {
    const { level } = build(themeIndex, seed);
    let node = 0;
    let steps = 0;
    const limit = level.nodes.length * 4;
    while (level.nodes[node].next.length > 0) {
      node = choose(level.nodes[node].next);
      expect(node, "next index out of range").toBeGreaterThanOrEqual(0);
      expect(node).toBeLessThan(level.nodes.length);
      steps++;
      expect(steps, "walk did not terminate").toBeLessThan(limit);
    }
    // The only dead end is the far end of the spine.
    expect(node).toBe(level.route.length - 1);
  });

  it.each(CASES)("%s seed %s: every branch rejoins ahead of its split", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (const branch of level.branches) {
      expect(branch.end).toBeGreaterThan(branch.start);
      expect(branch.nodes.length).toBeGreaterThan(0);
      const last = branch.nodes[branch.nodes.length - 1];
      expect(level.nodes[last].next).toEqual([branch.end]);
      expect(level.nodes[branch.start].next).toContain(branch.nodes[0]);
    }
  });

  it.each(CASES)("%s seed %s: branch strands are contiguous", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (const branch of level.branches) {
      const chain = [level.nodes[branch.start], ...branch.nodes.map((n) => level.nodes[n])];
      for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1];
        const b = chain[i];
        expect(Math.abs(a.col - b.col) + Math.abs(a.row - b.row)).toBe(1);
      }
    }
  });
});

describe("every generated level is winnable without gambling", () => {
  it.each(CASES)("%s seed %s: the safe spine alone can clear it", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    // A player who never steers must still be able to fill the pips, or the
    // fork stops being a choice and becomes a toll.
    const safeOnSpine = level.pickups.filter(
      (p) => !p.harmful && !p.onBranch && (p.kind === "spark" || p.kind === "golden" || p.kind === "hazard"),
    );
    expect(safeOnSpine.length).toBeGreaterThanOrEqual(PICKUP_TARGET);
  });

  it.each(CASES)("%s seed %s: branches are the greedier line", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    if (level.branches.length === 0) return;
    expect(level.pickups.some((p) => p.onBranch)).toBe(true);
  });

  it.each(CASES)("%s seed %s: every pickup sits beside a road", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    const roadRowsByCol = new Map<number, number[]>();
    for (const node of level.nodes) {
      const rows = roadRowsByCol.get(node.col) ?? [];
      rows.push(node.row);
      roadRowsByCol.set(node.col, rows);
    }
    for (const pickup of level.pickups) {
      const rows = roadRowsByCol.get(pickup.col);
      expect(rows, `pickup at col ${pickup.col} has no road in its column`).toBeDefined();
      const adjacent = (rows ?? []).some(
        (row) => pickup.row === row - 1 || pickup.row === row + ROAD_THICKNESS,
      );
      expect(adjacent, `pickup at ${pickup.col},${pickup.row} is not beside a road`).toBe(true);
    }
  });

  it.each(CASES)("%s seed %s: no pickup sits ON a road", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    for (const pickup of level.pickups) {
      expect(
        level.path[pickup.row * COLS + pickup.col],
        `pickup at ${pickup.col},${pickup.row} is on the road`,
      ).toBeNull();
    }
  });

  it.each(CASES)("%s seed %s: no two pickups share a cell", (_id, themeIndex, seed) => {
    const { level } = build(themeIndex, seed);
    const seen = new Set(level.pickups.map((p) => `${p.col},${p.row}`));
    expect(seen.size).toBe(level.pickups.length);
  });

  it.each(CASES)("%s seed %s: nothing is buried under scenery", (_id, themeIndex, seed) => {
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
    for (const node of level.nodes) {
      for (let t = 0; t < ROAD_THICKNESS; t++) {
        expect(occupied.has(`${node.col},${node.row + t}`), "prop on the road").toBe(false);
      }
    }
  });

  it.each(CASES)("%s seed %s: props stay inside the level", (_id, themeIndex, seed) => {
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
    expect(JSON.stringify(build(0, 12345).level)).toBe(JSON.stringify(build(0, 12345).level));
  });

  it("different seeds produce different levels", () => {
    expect(JSON.stringify(build(0, 1).level)).not.toBe(JSON.stringify(build(0, 2).level));
  });
});
