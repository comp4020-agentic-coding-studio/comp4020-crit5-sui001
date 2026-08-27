// Ten themes over five Kenney CC0 tilesets. Each tileset ships as one packed
// 16px sheet loaded with sliceX/sliceY, so a tile index IS a kaplay sprite
// frame -- no atlas JSON, no per-tile HTTP requests, one texture per theme
// (which also means the whole level batches into very few draw calls).
//
// A theme is data, not code: the generator in level.ts knows nothing about
// villages or dungeons, only about ground/path/prop/pickup roles. Adding an
// eleventh theme is a new entry here and nothing else.

export interface PropDef {
  // Row-major tile indices of the footprint, `w` wide. Lets a 1x1 mushroom
  // and a 3x3 castle come from the same list without special cases.
  w: number;
  tiles: number[];
}

export interface Theme {
  id: string;
  sheet: string;
  cols: number;
  rows: number;
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

const p = (w: number, ...tiles: number[]): PropDef => ({ w, tiles });

export const THEMES: readonly Theme[] = [
  {
    id: "village",
    sheet: "tiny-town",
    cols: 12,
    rows: 11,
    ground: [0, 0, 0, 0, 0, 1, 1, 43, 2],
    path: [25, 39, 40, 41, 42],
    props: [
      p(1, 3, 15, 27), // orange tree
      p(1, 4, 16, 28), // pine
      p(1, 5), // bush
      p(1, 17), // sprouts
      p(1, 29), // mushrooms
      p(2, 48, 50, 60, 62, 84, 86), // grey-roofed house
      p(2, 52, 54, 64, 66, 88, 90), // red-roofed house
      p(3, 80, 81, 82), // fence run
    ],
    pickups: [93, 94, 117, 130],
    player: 92,
    bg: [46, 74, 46],
  },
  {
    id: "keep",
    sheet: "tiny-town",
    cols: 12,
    rows: 11,
    ground: [0, 0, 0, 0, 1, 43, 2],
    path: [39, 40, 41, 42, 25],
    props: [
      p(3, 96, 97, 98, 108, 109, 110, 120, 121, 122), // castle block
      p(3, 111, 112, 113, 123, 124, 125, 120, 121, 122), // gatehouse
      p(1, 4, 16, 28),
      p(3, 80, 81, 82),
      p(1, 83), // signpost
    ],
    pickups: [95, 105, 131, 94],
    player: 104,
    bg: [46, 74, 46],
  },
  {
    id: "cropfield",
    sheet: "tiny-farm",
    cols: 12,
    // 12 rows, not 11: frames 132-138 are the ground row appended to this
    // sheet from Tiny Town, because Tiny Farm is an overlay pack with no
    // ground tile of its own. See public/tilesets/README.md.
    rows: 12,
    ground: [132, 132, 132, 132, 132, 132, 133, 134],
    path: [135, 136, 137, 138],
    props: [
      p(1, 6), // pumpkin
      p(1, 18), // beet
      p(1, 30), // corn
      p(1, 42), // tomato
      p(1, 54), // cabbage
      p(1, 66), // wheat
      p(1, 15),
      p(1, 39),
      p(3, 93, 94, 95, 90, 91, 92), // barn
    ],
    pickups: [9, 21, 33, 45],
    player: 108,
    bg: [60, 92, 52],
  },
  {
    id: "pasture",
    sheet: "tiny-farm",
    cols: 12,
    rows: 12,
    ground: [132, 132, 132, 132, 132, 133, 133, 134],
    path: [136, 135, 137, 138],
    props: [
      p(1, 120), // sheep
      p(1, 121), // cow
      p(1, 122), // chicken
      p(1, 123), // goose
      p(1, 83), // sunflower
      p(1, 78), // berry bush
      p(1, 27),
      p(1, 2), // dead branch
    ],
    pickups: [11, 23, 35, 47],
    player: 109,
    bg: [60, 92, 52],
  },
  {
    id: "dungeon",
    sheet: "tiny-dungeon",
    cols: 12,
    rows: 11,
    ground: [0, 0, 0, 0, 0, 1, 12],
    path: [48, 49, 50, 51, 53],
    props: [
      p(1, 63), // crate
      p(1, 66), // barrel
      p(1, 82), // keg
      p(1, 74), // anvil
      p(1, 89), // chest
      p(1, 91), // chest
      p(1, 127), // torch
    ],
    pickups: [113, 114, 115, 116],
    player: 96,
    bg: [26, 18, 22],
  },
  {
    id: "crypt",
    sheet: "tiny-dungeon",
    cols: 12,
    rows: 11,
    ground: [0, 0, 0, 1, 1, 24],
    path: [52, 53, 48, 50],
    props: [
      p(1, 108), // ghost
      p(1, 109), // mummy
      p(1, 122), // spider
      p(1, 121), // wraith
      p(1, 124), // remains
      p(1, 92), // mimic chest
      p(1, 129), // torch
    ],
    pickups: [101, 102, 103, 104],
    player: 84,
    bg: [22, 16, 26],
  },
  {
    id: "piste",
    sheet: "tiny-ski",
    cols: 12,
    rows: 11,
    ground: [0, 0, 2, 4, 5, 16, 17],
    // 74/75 look like a groomed run in the atlas but are a lift railing --
    // tiled, they draw a black bar across the piste. Packed snow plus a cold
    // tint reads as a run without pretending a tile exists that doesn't.
    path: [1, 3, 49, 5],
    pathTint: [168, 190, 232],
    props: [
      p(1, 6, 18, 30), // pine
      p(1, 8, 20), // red flag
      p(1, 9, 21), // blue flag
      p(1, 69), // snowman
      p(1, 81), // rock
      p(1, 67), // sled
    ],
    pickups: [47, 54, 66, 48],
    player: 70,
    bg: [214, 230, 244],
  },
  {
    id: "backcountry",
    sheet: "tiny-ski",
    cols: 12,
    rows: 11,
    ground: [0, 2, 5, 49, 52, 72, 73],
    path: [3, 1, 5, 49],
    pathTint: [150, 172, 214],
    props: [
      p(1, 7, 19, 31), // dead tree
      p(1, 81), // rock
      p(1, 78), // wolf
      p(1, 79),
      p(1, 80),
      p(1, 6, 18, 30),
    ],
    pickups: [57, 58, 59, 47],
    player: 82,
    bg: [200, 218, 236],
  },
  {
    id: "frontline",
    sheet: "tiny-battle",
    cols: 18,
    rows: 11,
    ground: [0, 0, 0, 0, 0, 1, 2],
    path: [127, 128, 145, 146],
    props: [
      p(1, 62), // red block
      p(1, 63),
      p(1, 44), // blue block
      p(1, 45),
      p(1, 133), // blue tank
      p(1, 151), // red tank
      p(1, 5), // bush
      p(1, 94),
      p(1, 160), // red soldier
    ],
    pickups: [192, 193, 196, 194],
    player: 142,
    bg: [64, 110, 58],
  },
  {
    id: "outpost",
    sheet: "tiny-battle",
    cols: 18,
    rows: 11,
    ground: [0, 0, 0, 0, 1, 1, 2],
    path: [145, 146, 127, 128],
    props: [
      p(1, 26), // green block
      p(1, 27),
      p(1, 80), // orange block
      p(1, 81),
      p(1, 115), // green tank
      p(1, 169), // orange tank
      p(1, 112), // trees
      p(1, 94),
      p(1, 178), // orange soldier
    ],
    pickups: [194, 195, 192, 196],
    player: 124,
    bg: [64, 110, 58],
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

// Never the same theme twice running -- with ten of them, an immediate repeat
// is the one outcome that makes the set feel smaller than it is.
let lastThemeId: string | null = null;

export function rollTheme(random: () => number = Math.random): Theme {
  const fresh = THEMES.filter((t) => t.id !== lastThemeId);
  const picked = fresh[Math.floor(random() * fresh.length)];
  lastThemeId = picked.id;
  return picked;
}
