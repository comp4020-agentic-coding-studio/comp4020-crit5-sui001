// Eight themes over four Kenney CC0 tilesets, two themes to a sheet. Each
// tileset is one packed sheet loaded with sliceX/sliceY, so a tile index IS a
// kaplay sprite frame -- no atlas JSON, no per-tile HTTP requests, one texture
// per sheet (which also means the whole level batches into very few draw calls).
//
// A theme is data, not code: the generator in level.ts knows nothing about
// crypts or space stations, only about ground/path/prop/pickup roles. Adding a
// ninth theme is a new entry here and nothing else.
//
// These packs run 64-92px rather than the 16px pixel art this started on, which
// is what `tileW` is for -- see the field's own note.

export interface PropDef {
  // Row-major tile indices of the footprint, `w` wide. Lets a 1x1 mushroom
  // and a 3x3 castle come from the same list without special cases.
  w: number;
  tiles: number[];
}

// Tiles once drew at a flat scale of 3, which silently assumed 16px source art.
// These packs are 64px and up, and a 64px tile at 3x is four times the width of
// the 48px grid cell it belongs in -- so scale follows the source art rather
// than being a constant. Omitted means 16, the pixel-art default.
export const DEFAULT_TILE_W = 16;

export interface Theme {
  id: string;
  sheet: string;
  cols: number;
  rows: number;
  // Native pixel width of one frame on this theme's sheet. See DEFAULT_TILE_W.
  tileW?: number;
  // Ground fills everything; index 0 is the plain variant and gets most of
  // the weight, the rest are speckles so large fields don't look stamped.
  ground: number[];
  path: number[];
  // Some packs have no tile that reads as "road" against their own ground
  // (snow on snow, soil on soil). Rather than force a wrong-looking tile, the
  // road can be drawn with a colour multiply so the walking line stays legible.
  pathTint?: [number, number, number];
  props: PropDef[];
  pickups: number[];
  player: number;
  bg: [number, number, number];
}

import { random as defaultRandom } from "./rng";

const p = (w: number, ...tiles: number[]): PropDef => ({ w, tiles });

export const THEMES: readonly Theme[] = [
  // Two themes per pack, the way one Kenney sheet gave both village and keep
  // back when this ran on the Tiny packs: a sheet has more than one place in it
  // if you pick different ground, a different route material and a different
  // half of the props.
  //
  // Frame indices for scribble-dungeon, hexagon-base and space-station are the
  // roster in scripts/pack-tileset.mjs, in order. nautical is Kenney's own
  // sheet untouched, so its indices are positions on that grid.
  {
    id: "scrawl",
    sheet: "scribble-dungeon",
    cols: 8,
    rows: 5,
    tileW: 64,
    ground: [0, 0, 0, 0, 0, 1, 2, 3],
    // Minecart track, not the pack's own floor_path -- that one is a few faint
    // scratches on the same flagstone as the ground and disappears entirely at
    // play scale, and a route you can't see is the whole game gone.
    path: [4, 4, 5, 6],
    props: [
      p(1, 8), // barrel
      p(1, 9), // barrels
      p(1, 10), // crate
      p(1, 11), // small crate
      p(1, 12), // chest
      p(1, 14), // campfire
      p(1, 18), // cart
      p(1, 19), // tree
      p(1, 20), // plants
      p(1, 22), // trapdoor
    ],
    pickups: [24, 25, 26, 27], // sword, axe, shield, staff
    player: 28, // green character token
    // Sketch art on white: the background is the paper it is drawn on, so this
    // is the one pack where a near-white bg is the point rather than a bug.
    bg: [246, 243, 236],
  },
  {
    id: "crypt",
    sheet: "scribble-dungeon",
    cols: 8,
    rows: 5,
    tileW: 64,
    // The cracked and decorative flagstones, where scrawl takes the clean ones.
    ground: [2, 2, 2, 2, 3, 38, 39],
    // Carpet and boards rather than track -- same dungeon, someone lived in it.
    path: [32, 32, 35, 36],
    props: [
      p(1, 13), // coffin
      p(1, 15), // table
      p(1, 16), // bed
      p(1, 17), // chair
      p(1, 21), // puddle
      p(1, 23), // stairs down
      p(1, 12), // chest
      p(1, 19), // tree
    ],
    pickups: [26, 27, 24, 25],
    player: 29, // purple character token
    bg: [234, 230, 222],
  },
  {
    id: "lagoon",
    sheet: "nautical",
    cols: 18,
    rows: 15,
    tileW: 70,
    // Plain seabed and its pebbled variant only -- the neighbouring sand frames
    // are edge pieces with a lavender corner baked in, which tiled across a
    // field reads as purple confetti.
    ground: [40, 40, 40, 40, 40, 41],
    // Ship decking, including the planks with a porthole set into them -- the
    // walking line reads as a jetty laid over the seabed.
    path: [111, 129, 129, 111, 113],
    props: [
      p(1, 64), // rock
      p(1, 66), // rock
      p(1, 82), // rock with coral
      p(1, 84), // rock with coral
      p(1, 10), // pink kelp
      p(1, 28), // green kelp
      p(1, 46), // purple coral
      p(1, 47), // orange coral
      p(1, 16), // anchor
      p(1, 150), // barrel
      p(1, 124), // treasure chest
    ],
    pickups: [85, 87, 104, 105], // starfish, snail shell, pearl clam, sea glass
    // This pack has no character tile of any kind, so the player is the diving
    // helmet: the only thing on the sheet that reads as someone being here.
    player: 89,
    bg: [46, 106, 122],
  },
  {
    id: "trench",
    sheet: "nautical",
    cols: 18,
    rows: 15,
    tileW: 70,
    // Open water instead of seabed, which inverts the route: in lagoon the
    // decking is the path over sand, here the sandbar is the path through deep
    // water. Same sheet, opposite read.
    ground: [4, 4, 4, 4, 4, 5],
    path: [40, 40, 41],
    props: [
      p(1, 118), // stone column
      p(1, 119), // column with algae
      p(1, 120), // broken column
      p(1, 125), // treasure chest
      p(1, 34), // rusted anchor
      p(1, 48), // yellow coral
      p(1, 49), // blue coral
      p(1, 50), // anemone
      p(1, 32), // green weed
      p(1, 83), // rock with coral
    ],
    pickups: [100, 101, 102, 105], // bubbles, air pocket, scallop, sea glass
    player: 89,
    bg: [22, 62, 78],
  },
  {
    id: "grove",
    sheet: "hexagon-base",
    cols: 6,
    rows: 5,
    // 65, not the 92px cell: a hex is 65 wide inside that cell, so scaling by
    // the cell leaves a quarter-tile of background at every edge and the field
    // reads as scattered confetti. Scaling by the hex itself makes them meet
    // side to side, and the spare cell height is the transparent margin the
    // rows nest into.
    tileW: 65,
    // Grass only. Dirt is the same brown as the wooden bridge that marks the
    // route, and a path you can't pick out from the ground is no path.
    ground: [0],
    // Actual bridge tiles, so this is the one pack that needs no pathTint.
    path: [6, 6, 7],
    props: [
      p(1, 8), // green tree
      p(1, 9), // autumn tree
      p(1, 10), // green pine
      p(1, 11), // blue pine
      p(1, 12), // bush
      p(1, 13), // magic bush
      p(1, 14), // boulder
      p(1, 16), // small rock
    ],
    pickups: [18, 19, 20, 21], // red, yellow, blue and white flowers
    player: 22, // green alien
    // Hexes on a square walk grid never tile perfectly flush, so the bg shows
    // in the seams and has to look chosen. Dark slate reads as the board the
    // tiles sit on rather than as holes in the floor.
    bg: [38, 48, 54],
  },
  {
    id: "badlands",
    sheet: "hexagon-base",
    cols: 6,
    rows: 5,
    tileW: 65,
    ground: [3, 3, 3, 3, 3, 2], // sand, with dirt breaking it up
    path: [4, 4, 6], // bare stone and the stone bridge
    props: [
      p(1, 26), // cactus
      p(1, 27), // cactus
      p(1, 14), // boulder
      p(1, 15), // mossy boulder
      p(1, 17), // small stone
      p(1, 9), // autumn tree
      p(1, 24), // lava pool
    ],
    pickups: [18, 19, 21, 20],
    player: 28, // beige alien
    bg: [48, 34, 30],
  },
  {
    id: "deck",
    sheet: "space-station",
    cols: 8,
    rows: 6,
    // 44, well under the 64px cell: these are isometric renders, so the floor
    // plate is a diamond that leaves the cell corners empty and tiles into a
    // scatter of islands rather than a floor. Overlapping them closes the deck
    // back up, at the cost of the far edge of each plate being covered.
    tileW: 44,
    ground: [0, 0, 0, 0, 1, 2],
    // Panelled plating marks the route, but plate-vs-plate is far too quiet a
    // difference at this size, so the walkway is lit as well. This is what
    // pathTint is for -- see its note on the Theme interface.
    path: [3, 4, 4, 5, 6],
    pathTint: [255, 176, 96],
    props: [
      p(1, 10), // wall
      p(1, 11), // window
      p(1, 12), // door
      p(1, 13), // pillar
      p(1, 16), // display wall
      p(1, 17), // console
      p(1, 21), // table
      p(1, 23), // display table
      p(1, 24), // planet display
      p(1, 26), // chair
      p(1, 28), // bunk
      p(1, 29), // double bunk
    ],
    pickups: [37, 38, 44, 30], // pipe ring, pipe cap, ore, canister
    // No humanoid in this pack either. The upright banded canister is the one
    // object on the sheet that reads as a thing that moves under its own steam.
    player: 31,
    bg: [22, 26, 38],
  },
  {
    id: "engineering",
    sheet: "space-station",
    cols: 8,
    rows: 6,
    tileW: 44,
    // The inverse of deck: grating everywhere, and the smooth plate is the
    // walkway through it rather than the other way round.
    ground: [3, 3, 3, 3, 4, 5],
    path: [0, 0, 7, 8],
    pathTint: [120, 200, 255],
    props: [
      p(1, 35), // pipe
      p(1, 36), // pipe bend
      p(1, 39), // frame
      p(1, 40), // barrier
      p(1, 41), // panel
      p(1, 42), // stairs
      p(1, 43), // ramp
      p(1, 32), // wide canister
      p(1, 33), // flat canister
      p(1, 20), // computer stack
      p(1, 9), // rail
    ],
    pickups: [44, 37, 38, 30],
    player: 46, // skip
    bg: [34, 28, 30],
  },
];

// The sheets actually referenced above, deduped -- assets.ts loads exactly
// these and nothing else.
export const SHEETS: ReadonlyArray<{ name: string; cols: number; rows: number }> = Object.values(
  THEMES.reduce<Record<string, { name: string; cols: number; rows: number }>>((acc, t) => {
    acc[t.sheet] = { name: t.sheet, cols: t.cols, rows: t.rows };
    return acc;
  }, {}),
);

// Never the same theme twice running -- with eight of them, and two sharing
// each sheet, an immediate repeat is the one outcome that makes the set feel
// smaller than it is.
let lastThemeId: string | null = null;

export function rollTheme(
  allowed?: readonly string[],
  random: () => number = defaultRandom,
): Theme {
  const pool = allowed && allowed.length > 0
    ? THEMES.filter((t) => allowed.includes(t.id))
    : THEMES;
  const usable = pool.length > 0 ? pool : THEMES;
  const fresh = usable.filter((t) => t.id !== lastThemeId);
  const options = fresh.length > 0 ? fresh : usable;
  const picked = options[Math.floor(random() * options.length)];
  lastThemeId = picked.id;
  return picked;
}

export function resetThemeHistory(): void {
  lastThemeId = null;
}
