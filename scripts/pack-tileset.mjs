// One-time tileset packer. Not part of the site build -- it exists so the
// sheets in public/tilesets/ can be regenerated from their Kenney sources
// instead of being unexplained binaries someone edited in a paint program.
//
// assets.ts loads every sheet with a uniform sliceX/sliceY, so a tile index IS
// a sprite frame. Two of the new packs don't ship a sheet in that shape -- one
// keeps its characters in loose files outside the grid, the other has no grid
// at all -- so this composites the frames we want onto a fresh even grid.
//
// Usage: node scripts/pack-tileset.mjs [name ...]   (default: all recipes)

import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KENNEY = "/mnt/c/Users/u4419394/Downloads/Kenney Game Assets All-in-1 3.7.0";

const read = (path) => PNG.sync.read(readFileSync(path));

// Blits `src` into `dst` at (dx, dy), source-over so transparent pixels don't
// punch holes in what's underneath. Pixels outside dst are dropped rather than
// wrapping, so an oversized source clips instead of corrupting the next row.
function blit(dst, src, dx, dy, sx = 0, sy = 0, sw = src.width, sh = src.height) {
  for (let y = 0; y < sh; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < sw; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = ((sy + y) * src.width + (sx + x)) * 4;
      const t = (ty * dst.width + tx) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const ia = 1 - a;
      dst.data[t] = src.data[s] * a + dst.data[t] * ia;
      dst.data[t + 1] = src.data[s + 1] * a + dst.data[t + 1] * ia;
      dst.data[t + 2] = src.data[s + 2] * a + dst.data[t + 2] * ia;
      dst.data[t + 3] = Math.round(255 * (a + (dst.data[t + 3] / 255) * ia));
    }
  }
}

const blank = (w, h) => new PNG({ width: w, height: h, fill: true });

// Bilinear upscale. The hex pack's flowers are 12px icons meant to be dropped on
// a 92px tile as decoration; used as pickups they end up ~6px on screen, which is
// not something a player can be asked to aim at. Blowing them up here (rather
// than scaling at draw time) keeps the one-frame-size-per-sheet rule intact, and
// bilinear rather than nearest because flat vector art rescales cleanly and the
// rest of this sheet is crisp.
function upscale(img, factor) {
  const w = Math.round(img.width * factor);
  const h = Math.round(img.height * factor);
  const out = new PNG({ width: w, height: h, fill: true });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = Math.min((x + 0.5) / factor - 0.5, img.width - 1);
      const gy = Math.min((y + 0.5) / factor - 0.5, img.height - 1);
      const x0 = Math.max(0, Math.floor(gx));
      const y0 = Math.max(0, Math.floor(gy));
      const x1 = Math.min(x0 + 1, img.width - 1);
      const y1 = Math.min(y0 + 1, img.height - 1);
      const fx = gx - x0;
      const fy = gy - y0;
      const t = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p = (yy, xx) => img.data[(yy * img.width + xx) * 4 + c];
        const top = p(y0, x0) * (1 - fx) + p(y0, x1) * fx;
        const bot = p(y1, x0) * (1 - fx) + p(y1, x1) * fx;
        out.data[t + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return out;
}

// Drops `tiles` into a cell grid, each centred in its cell. Centring matters
// for the hex pack, whose tiles are 65x89 in a square cell -- left-aligned
// they'd sit off to one side of the walk grid.
function packGrid({ cell, cols, rows, tiles }) {
  const out = blank(cols * cell, rows * cell);
  tiles.forEach((tile, index) => {
    if (!tile) return;
    // A tile is a path, or `[path, zoom]` for the ones too small to aim at.
    const [path, zoom] = Array.isArray(tile) ? tile : [tile, 1];
    const img = zoom === 1 ? read(path) : upscale(read(path), zoom);
    // A source taller than the cell doesn't just crop -- centred, it bleeds a few
    // pixels into the neighbouring cells, which shows up in game as a stray line
    // through an unrelated tile and is miserable to trace back to here. Fail loud.
    if (img.width > cell || img.height > cell) {
      throw new Error(`${path} is ${img.width}x${img.height}, larger than the ${cell}px cell`);
    }
    const col = index % cols;
    const row = Math.floor(index / cols);
    blit(
      out,
      img,
      col * cell + Math.round((cell - img.width) / 2),
      row * cell + Math.round((cell - img.height) / 2),
    );
  });
  return out;
}

const recipes = {
  // Scribble Dungeons does ship a 14x11 64px grid, but it's laid out for a human
  // reading a contact sheet, not for indexing -- the roles aren't grouped and the
  // characters aren't on it at all (they live in Characters/, and theme.player has
  // to be a frame on the theme's own sheet). Its loose files are semantically
  // named, so the sheet is rebuilt from those instead: every cell is known by
  // construction rather than reverse-engineered by counting squares.
  "scribble-dungeon": () => {
    const dir = `${KENNEY}/2D assets/Scribble Dungeons/PNG/Default (64px)`;
    const png = (n) => `${dir}/${n}.png`;
    return packGrid({
      cell: 64,
      cols: 8,
      rows: 5,
      tiles: [
        // row 0 -- ground, then paths. Paths use the floor_* variants: level.ts
        // swaps a path tile IN PLACE of the ground tile rather than over it, so a
        // transparent path overlay would leave holes in the floor. The pack's own
        // floor_path is a few faint scratches on the same flagstone as the ground
        // and vanishes at play scale, so the route is drawn as minecart track
        // instead -- dark, continuous, and unmistakably somewhere to walk.
        png("tile"), png("tiles"), png("tiles_cracked"), png("tiles_decorative"),
        png("floor_track"), png("floor_track_curve"), png("floor_track_crossing"), png("floor_planks"),
        // row 1 -- props
        png("barrel"), png("barrels"), png("crate"), png("crate_small"),
        png("chest"), png("coffin"), png("campfire"), png("table"),
        // row 2 -- more props
        png("bed"), png("chair"), png("cart"), png("tree"),
        png("plants"), png("puddle"), png("trapdoor_round"), png("stairs_down"),
        // row 3 -- pickups, then the player tokens
        png("Items/weapon_sword"), png("Items/weapon_axe"),
        png("Items/shield_curved"), png("Items/weapon_staff"),
        png("Characters/green_character"), png("Characters/purple_character"),
        png("Characters/red_character"), png("Characters/yellow_character"),
        // row 4 -- spare surfaces, kept for path variants worth trying
        png("carpet"), png("water"), png("grass"), png("wood"),
        png("floor_puddle"), png("floor_track_cart"), png("tiles_center"), png("tiles_corner"),
      ],
    });
  },

  // The hex pack has no uniform sheet anywhere -- only irregular TexturePacker
  // atlases -- but every terrain tile is cropped to an identical 65x89 box, so
  // one can be built. Cell is 92: the tallest thing here is a 65x91 rock, and the
  // _mid/_high trees (up to 107) are left out rather than pushing every hex a
  // further 16px apart on screen to accommodate two props.
  "hexagon-base": () => {
    const dir = `${KENNEY}/2D assets/Hexagon Base Pack/PNG`;
    const png = (n) => `${dir}/${n}.png`;
    return packGrid({
      cell: 92,
      cols: 6,
      rows: 4,
      tiles: [
        // row 0 -- ground candidates
        png("tileGrass_tile"), png("tileMagic_tile"), png("tileDirt_tile"),
        png("tileSand_tile"), png("tileStone_tile"), png("tileAutumn_tile"),
        // row 1 -- paths (real bridge tiles, so no pathTint fudge needed) and trees
        png("tileStone_bridge"), png("tileWood_bridge"), png("treeGreen_low"),
        png("treeAutumn_low"), png("pineGreen_low"), png("pineBlue_low"),
        // row 2 -- props
        png("bushGrass"), png("bushMagic"), png("rockStone"),
        png("rockStone_moss1"), png("smallRockGrass"), png("smallRockStone"),
        // row 3 -- pickups, then the player. The flowers are 12px decorations
        // blown up to something a player can actually aim at; see upscale().
        [png("flowerRed"), 4], [png("flowerYellow"), 4], [png("flowerBlue"), 4],
        [png("flowerWhite"), 4], png("alienGreen"), png("alienPink"),
      ],
    });
  },
};

const names = process.argv.slice(2);
const wanted = names.length > 0 ? names : Object.keys(recipes);

for (const name of wanted) {
  const recipe = recipes[name];
  if (!recipe) {
    console.error(`no recipe for "${name}" (have: ${Object.keys(recipes).join(", ")})`);
    process.exitCode = 1;
    continue;
  }
  const out = recipe();
  const dest = resolve(ROOT, "public/tilesets", `${name}.png`);
  writeFileSync(dest, PNG.sync.write(out, { deflateLevel: 9 }));
  console.log(`${name}.png  ${out.width}x${out.height}`);
}
