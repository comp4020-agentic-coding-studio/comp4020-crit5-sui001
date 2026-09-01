// Procedural level generation. Pure and framework-free -- no kaplay import --
// so spec/level.test.ts can assert the invariants that actually matter (the
// walk reaches the end, every pickup sits beside a road you can walk, the
// safe route alone is always enough to clear) with no canvas involved.
//
// The generator knows nothing about villages or dungeons. It reads roles off
// a Theme and lays tiles; that's why one function drives all ten themes.

import { CHAIN_LENGTH, type PickupKind, isHarmful } from "./pickups";
import { random as defaultRandom } from "./rng";
import type { PropDef, Theme } from "./themes";

export interface Cell {
  col: number;
  row: number;
}

// The walk is a graph, not a line. Most nodes have one successor; a node at a
// fork has two, and the player's up/down input picks between them. Everything
// else about forks -- drawing them, stocking them, testing them -- falls out
// of this one shape.
export interface WalkNode extends Cell {
  next: number[];
}

export interface Branch {
  /** Node index where the road splits. */
  start: number;
  /** Node index where the strands rejoin. */
  end: number;
  /** Node indices of the alternate strand, in walking order. */
  nodes: number[];
}

export interface PlacedProp extends Cell {
  w: number;
  h: number;
  tiles: number[];
}

export interface PlacedPickup extends Cell {
  tile: number;
  kind: PickupKind;
  /** Cached isHarmful(kind, inverted) so consumers don't re-derive it. */
  harmful: boolean;
  /** True when it sits on a branch rather than the safe spine. */
  onBranch: boolean;
  /** Set only on chain links; members share an id and run 0..CHAIN_LENGTH-1. */
  chainId?: number;
  chainIndex?: number;
}

export interface Level {
  cols: number;
  rows: number;
  // Row-major, length cols*rows. `path` is null where there's no road.
  ground: number[];
  path: (number | null)[];
  /** The safe spine, left to right. Indices 0..spineLength-1 of `nodes`. */
  route: Cell[];
  nodes: WalkNode[];
  branches: Branch[];
  props: PlacedProp[];
  pickups: PlacedPickup[];
}

export interface GenerateOptions {
  cols: number;
  rows: number;
  /** Beneficial, always-counting pickups guaranteed on the spine alone. */
  pickupTarget: number;
  /** Modifier knobs. */
  hazardBias?: number;
  pickupScale?: number;
  inverted?: boolean;
  random?: () => number;
}

// The road is this many tiles tall; the player walks down its centre line.
export const ROAD_THICKNESS = 2;
// Keep roads off the very top/bottom so props and pickups always have a tile
// on both sides of them.
const VERTICAL_MARGIN = 3;
// How far a branch swings away from the spine before running parallel.
const BRANCH_OFFSET = 3;
const BRANCH_MIN_SPAN = 8;
const BRANCH_MAX_SPAN = 14;
// Branches are the greedy line: more to grab, and far more that bites.
const SPINE_HAZARD_CHANCE = 0.3;
const BRANCH_HAZARD_CHANCE = 0.45;
const GOLDEN_CHANCE = 0.12;
const BEAT_GEM_CHANCE = 0.22;
const DECOY_CHANCE = 0.18;
const MAX_CHAINS = 2;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function buildSpine(cols: number, rows: number, random: () => number): Cell[] {
  const minRow = VERTICAL_MARGIN;
  const maxRow = rows - VERTICAL_MARGIN - ROAD_THICKNESS;
  const route: Cell[] = [];
  let row = Math.floor((minRow + maxRow) / 2);
  let col = 0;

  const push = (c: number, r: number) => {
    const last = route[route.length - 1];
    if (last && last.col === c && last.row === r) return;
    route.push({ col: c, row: r });
  };

  push(col, row);
  while (col < cols - 1) {
    const run = 3 + Math.floor(random() * 6);
    for (let i = 0; i < run && col < cols - 1; i++) {
      col++;
      push(col, row);
    }
    if (col >= cols - 1) break;

    const span = 1 + Math.floor(random() * 3);
    const dir = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < span; i++) {
      const next = row + dir;
      if (next < minRow || next > maxRow) break;
      row = next;
      push(col, row);
    }
  }
  return route;
}

// An alternate strand from spine[start] to spine[end]: peel away vertically,
// run parallel, then rejoin. Built one cell at a time so the strand is always
// contiguous, which is what makes it walkable and what the tests check.
function buildBranchCells(
  spine: Cell[],
  start: number,
  end: number,
  rows: number,
  random: () => number,
): Cell[] | null {
  const minRow = VERTICAL_MARGIN;
  const maxRow = rows - VERTICAL_MARGIN - ROAD_THICKNESS;
  const from = spine[start];
  const to = spine[end];

  const dir = random() < 0.5 ? -1 : 1;
  let offsetRow = from.row + dir * BRANCH_OFFSET;
  if (offsetRow < minRow || offsetRow > maxRow) {
    offsetRow = from.row - dir * BRANCH_OFFSET;
    if (offsetRow < minRow || offsetRow > maxRow) return null;
  }

  const cells: Cell[] = [];
  const push = (c: number, r: number) => {
    const last = cells[cells.length - 1];
    if (last && last.col === c && last.row === r) return;
    cells.push({ col: c, row: r });
  };

  const step = offsetRow > from.row ? 1 : -1;
  for (let r = from.row + step; r !== offsetRow + step; r += step) push(from.col, r);

  const across = to.col > from.col ? 1 : -1;
  for (let c = from.col + across; c !== to.col + across; c += across) push(c, offsetRow);

  const back = to.row > offsetRow ? 1 : -1;
  if (to.row !== offsetRow) {
    for (let r = offsetRow + back; r !== to.row; r += back) push(to.col, r);
  }

  return cells.length > 0 ? cells : null;
}

function footprintFits(
  prop: PropDef,
  col: number,
  row: number,
  cols: number,
  rows: number,
  blocked: Uint8Array,
): boolean {
  const h = prop.tiles.length / prop.w;
  if (col < 0 || row < 0 || col + prop.w > cols || row + h > rows) return false;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < prop.w; dx++) {
      if (blocked[(row + dy) * cols + (col + dx)]) return false;
    }
  }
  return true;
}

export function generateLevel(theme: Theme, opts: GenerateOptions): Level {
  const random = opts.random ?? defaultRandom;
  const { cols, rows } = opts;
  const inverted = opts.inverted ?? false;
  const hazardBias = opts.hazardBias ?? 0;
  const pickupScale = opts.pickupScale ?? 1;
  const size = cols * rows;

  // In an inverted universe the good thing IS the hazard kind. Rather than
  // invent dark twins of every bright pickup, inversion runs a stripped
  // two-kind palette: it's a high-attention universe, not a richer one.
  const goodKind: PickupKind = inverted ? "hazard" : "spark";
  const badKind: PickupKind = inverted ? "spark" : "hazard";

  const ground: number[] = new Array(size);
  for (let i = 0; i < size; i++) ground[i] = pick(theme.ground, random);

  const path: (number | null)[] = new Array(size).fill(null);
  const spine = buildSpine(cols, rows, random);

  const nodes: WalkNode[] = spine.map((cell, i) => ({
    col: cell.col,
    row: cell.row,
    next: i < spine.length - 1 ? [i + 1] : [],
  }));

  // --- forks ---
  const branches: Branch[] = [];
  let cursor = 4;
  while (cursor < spine.length - BRANCH_MIN_SPAN - 4) {
    const span = BRANCH_MIN_SPAN + Math.floor(random() * (BRANCH_MAX_SPAN - BRANCH_MIN_SPAN + 1));
    const start = cursor;
    const end = Math.min(cursor + span, spine.length - 2);
    const cells = buildBranchCells(spine, start, end, rows, random);
    if (cells) {
      const indices: number[] = [];
      for (const cell of cells) {
        indices.push(nodes.length);
        nodes.push({ col: cell.col, row: cell.row, next: [] });
      }
      for (let i = 0; i < indices.length - 1; i++) nodes[indices[i]].next = [indices[i + 1]];
      nodes[indices[indices.length - 1]].next = [end];
      // The split point now offers both strands. Spine first, so a player who
      // never touches the steering wheel always takes the safe line.
      nodes[start].next = [start + 1, indices[0]];
      branches.push({ start, end, nodes: indices });
      cursor = end + 5;
    } else {
      cursor += 6;
    }
  }

  // --- road tiles + the shoulder props may not use ---
  const blocked = new Uint8Array(size);
  const block = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    blocked[r * cols + c] = 1;
  };

  for (const node of nodes) {
    for (let t = 0; t < ROAD_THICKNESS; t++) {
      const r = node.row + t;
      if (r >= rows) continue;
      path[r * cols + node.col] = pick(theme.path, random);
    }
    for (let t = -1; t <= ROAD_THICKNESS; t++) block(node.col, node.row + t);
    for (let t = 0; t < ROAD_THICKNESS; t++) {
      block(node.col - 1, node.row + t);
      block(node.col + 1, node.row + t);
    }
  }

  // --- pickups -----------------------------------------------------------
  // Guaranteed stock on the spine first, all of it beneficial and all of it
  // always-counting, so the timid line is always enough to clear the universe.
  // Only then do hazards, gems, chains and branch stock go down. A generator
  // that can hand you an unwinnable level is the bug this whole file guards.
  const pickups: PlacedPickup[] = [];
  const used = new Uint8Array(size);

  const place = (
    node: WalkNode,
    kind: PickupKind,
    onBranch: boolean,
    chain?: { id: number; index: number },
  ): boolean => {
    const above = node.row - 1;
    const below = node.row + ROAD_THICKNESS;
    const candidates = random() < 0.5 ? [above, below] : [below, above];
    for (const r of candidates) {
      if (r < 0 || r >= rows) continue;
      if (used[r * cols + node.col]) continue;
      // Forks put two strands three rows apart, so one strand's shoulder can
      // land on the other's road. A pickup in the middle of a road reads as
      // scenery and breaks the "beside the line" contract.
      if (path[r * cols + node.col] !== null) continue;
      pickups.push({
        col: node.col,
        row: r,
        tile: pick(theme.pickups, random),
        kind,
        harmful: isHarmful(kind, inverted),
        onBranch,
        ...(chain ? { chainId: chain.id, chainIndex: chain.index } : {}),
      });
      used[r * cols + node.col] = 1;
      block(node.col, r);
      return true;
    }
    return false;
  };

  const spineStride = Math.max(2, Math.floor(spine.length / (opts.pickupTarget + 1)));
  let placedGood = 0;
  for (let i = spineStride; i < spine.length && placedGood < opts.pickupTarget; i += spineStride) {
    // Golden is a straight upgrade of the good kind, so it can live inside the
    // guaranteed set without weakening the winnability floor.
    const kind: PickupKind = !inverted && random() < GOLDEN_CHANCE ? "golden" : goodKind;
    if (place(nodes[i], kind, false)) placedGood++;
  }
  for (let i = 1; i < spine.length && placedGood < opts.pickupTarget; i++) {
    if (place(nodes[i], goodKind, false)) placedGood++;
  }

  // Harmful stock on the spine.
  const spineHazardChance = Math.min(0.75, SPINE_HAZARD_CHANCE + hazardBias);
  for (let i = 2; i < spine.length; i += 3) {
    if (random() >= spineHazardChance) continue;
    // A decoy renders as the good kind until you're nearly on it. Never in an
    // inverted universe -- a disguise whose reveal is good news reads as noise.
    const kind: PickupKind = !inverted && random() < DECOY_CHANCE ? "decoy" : badKind;
    place(nodes[i], kind, false);
  }

  // Beat gems and chains: extra flavour, never load-bearing for clearing.
  if (!inverted) {
    let chains = 0;
    for (let i = 5; i < spine.length - CHAIN_LENGTH * 4; i += 11) {
      if (chains >= MAX_CHAINS || random() > 0.5 * pickupScale) continue;
      let links = 0;
      for (let n = 0; n < CHAIN_LENGTH; n++) {
        const node = nodes[i + n * 3];
        if (node && place(node, "chain", false, { id: chains, index: n })) links++;
      }
      // A partial chain can never be completed, so it would sit there as a
      // trap the rules cannot resolve. Drop it back to plain sparks instead.
      if (links === CHAIN_LENGTH) chains++;
      else {
        for (const pickup of pickups) {
          if (pickup.chainId === chains) {
            pickup.kind = "spark";
            pickup.harmful = false;
            delete pickup.chainId;
            delete pickup.chainIndex;
          }
        }
      }
    }

    for (let i = 4; i < spine.length; i += 7) {
      if (random() < BEAT_GEM_CHANCE * pickupScale) place(nodes[i], "beatGem", false);
    }
  }

  // Branch stock: more of everything, and far more that bites.
  const branchHazardChance = Math.min(0.8, BRANCH_HAZARD_CHANCE + hazardBias);
  for (const branch of branches) {
    for (let i = 0; i < branch.nodes.length; i += 3) {
      if (random() > pickupScale) continue;
      const node = nodes[branch.nodes[i]];
      if (random() < branchHazardChance) {
        place(node, !inverted && random() < DECOY_CHANCE ? "decoy" : badKind, true);
      } else {
        place(node, !inverted && random() < GOLDEN_CHANCE * 2 ? "golden" : goodKind, true);
      }
    }
  }

  // --- scenery ------------------------------------------------------------
  // Sparse, and with a one-tile gap reserved around each prop. A first pass
  // filled roughly a third of the field and read as confetti: the road stopped
  // being the obvious line and pickups vanished into the noise.
  const props: PlacedProp[] = [];
  const attempts = Math.floor(size * 0.12);
  for (let a = 0; a < attempts; a++) {
    const prop = pick(theme.props, random);
    const h = prop.tiles.length / prop.w;
    const col = Math.floor(random() * cols);
    const row = Math.floor(random() * rows);
    if (!footprintFits(prop, col, row, cols, rows, blocked)) continue;
    for (let dy = -1; dy <= h; dy++) {
      for (let dx = -1; dx <= prop.w; dx++) block(col + dx, row + dy);
    }
    props.push({ col, row, w: prop.w, h, tiles: prop.tiles });
  }

  return { cols, rows, ground, path, route: spine, nodes, branches, props, pickups };
}
