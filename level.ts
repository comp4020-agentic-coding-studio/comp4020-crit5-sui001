// Procedural level generation. Pure and framework-free -- no kaplay import --
// so spec/level.test.ts can assert the invariants that actually matter
// (the route reaches the end, every pickup sits beside the route, there are
// always enough pickups to clear the threshold) with no canvas involved.
//
// The generator knows nothing about villages or dungeons. It reads roles off
// a Theme and lays tiles; that's why one function drives all ten themes.

import type { PropDef, Theme } from "./themes";

export interface Cell {
  col: number;
  row: number;
}

export interface PlacedProp extends Cell {
  w: number;
  h: number;
  tiles: number[];
}

export interface PlacedPickup extends Cell {
  tile: number;
}

export interface Level {
  cols: number;
  rows: number;
  // Row-major, length cols*rows. `path` is null where there's no road.
  ground: number[];
  path: (number | null)[];
  // Ordered walkable cells from the left edge to the right edge. The player
  // follows this as a polyline; it is also the spine everything else hangs
  // off, which is why it's generated first.
  route: Cell[];
  props: PlacedProp[];
  pickups: PlacedPickup[];
}

export interface GenerateOptions {
  cols: number;
  rows: number;
  pickupTarget: number;
  random?: () => number;
}

// The road is this many tiles tall; the player walks down its centre line.
export const ROAD_THICKNESS = 2;
// Keep the route off the very top/bottom so props and pickups always have a
// tile to occupy on both sides of it.
const VERTICAL_MARGIN = 3;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function buildRoute(cols: number, rows: number, random: () => number): Cell[] {
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
    // Run right for a stretch...
    const run = 3 + Math.floor(random() * 6);
    for (let i = 0; i < run && col < cols - 1; i++) {
      col++;
      push(col, row);
    }
    if (col >= cols - 1) break;

    // ...then bend, one tile at a time so the road stays connected.
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
  const random = opts.random ?? Math.random;
  const { cols, rows } = opts;
  const size = cols * rows;

  const ground: number[] = new Array(size);
  for (let i = 0; i < size; i++) ground[i] = pick(theme.ground, random);

  const path: (number | null)[] = new Array(size).fill(null);
  const route = buildRoute(cols, rows, random);

  // `blocked` marks anything a prop may not sit on: the road itself plus a
  // one-tile shoulder, so scenery never crowds the walking line or hides a
  // pickup behind a house.
  const blocked = new Uint8Array(size);
  const block = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    blocked[r * cols + c] = 1;
  };

  for (const cell of route) {
    for (let t = 0; t < ROAD_THICKNESS; t++) {
      const r = cell.row + t;
      if (r >= rows) continue;
      path[r * cols + cell.col] = pick(theme.path, random);
    }
    for (let t = -1; t <= ROAD_THICKNESS; t++) block(cell.col, cell.row + t);
    for (let t = 0; t < ROAD_THICKNESS; t++) {
      block(cell.col - 1, cell.row + t);
      block(cell.col + 1, cell.row + t);
    }
  }

  // Pickups first, so scenery can never steal a slot a pickup needed. They go
  // on the shoulder of the road -- always within the player's reach as they
  // walk past, which is the whole contract the activation mechanic rests on.
  const pickups: PlacedPickup[] = [];
  const pickupCells = new Uint8Array(size);
  const stride = Math.max(2, Math.floor(route.length / (opts.pickupTarget + 1)));
  for (let i = stride; i < route.length && pickups.length < opts.pickupTarget; i += stride) {
    const cell = route[i];
    const above = cell.row - 1;
    const below = cell.row + ROAD_THICKNESS;
    const candidates = random() < 0.5 ? [above, below] : [below, above];
    for (const r of candidates) {
      if (r < 0 || r >= rows) continue;
      if (pickupCells[r * cols + cell.col]) continue;
      pickups.push({ col: cell.col, row: r, tile: pick(theme.pickups, random) });
      pickupCells[r * cols + cell.col] = 1;
      block(cell.col, r);
      break;
    }
  }

  // Scenery last, and sparsely. A first pass at this filled roughly a third of
  // the field and the result read as confetti -- the road stopped being the
  // obvious line through the scene and pickups vanished into the noise. Props
  // also reserve a one-tile gap around themselves so they read as objects in a
  // landscape rather than a texture.
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

  return { cols, rows, ground, path, route, props, pickups };
}
