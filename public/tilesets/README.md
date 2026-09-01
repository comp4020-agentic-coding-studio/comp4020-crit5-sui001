# Tilesets

Kenney CC0 packs, each shipped as one packed sheet so a tile index is a kaplay
sprite frame (see `assets.ts`): Tiny Town, Tiny Farm, Tiny Dungeon, Tiny Ski,
Tiny Battle, Scribble Dungeons, Platformer Pack Nautical, Hexagon Base Pack.
`LICENSE.txt` is Kenney's, and covers all of them.

The five Tiny packs are 16px art. The three later ones are not, which is what
`Theme.tileW` exists for -- without it a 70px tile draws four cells wide.

## Sheets that are not byte-identical to their pack

`tiny-farm.png` -- Tiny Farm is an overlay set: every flat tile in it is a soil
bed or a barn-roof slope, so it has nothing that can serve as ground, and a
level generated on it came out as a field of repeating lozenges. A 12th row was
appended carrying seven ground tiles copied from Tiny Town (3 grass, 4 dirt),
which is why the farm themes declare `rows: 12` and index frames 132-138. Same
author, same licence, same palette, so the seam does not show.

`scribble-dungeon.png` and `hexagon-base.png` are built by
`scripts/pack-tileset.mjs` from the packs' loose PNGs, and that script is the
authoritative record of which frame is what.

- **Scribble Dungeons** does ship a 14x11 sheet, but it is laid out for a human
  reading a contact sheet -- roles aren't grouped, and the four characters
  aren't on it at all. `Theme.player` has to be a frame on the theme's own
  sheet, so rather than append a row and still be counting squares to find the
  chest, the sheet is rebuilt from the semantically named loose files into an
  8x4 grid: ground, paths, props, props, then pickups and the player tokens.
- **Hexagon Base Pack** has no uniform sheet anywhere -- only irregular
  TexturePacker atlases -- but every terrain tile is cropped to the same 65x89
  box, so one can be built. Cells are 92px (the tallest asset used is a 65x91
  rock); the `_mid`/`_high` trees are left out because at 107px they would have
  pushed every hex a further 16px apart on screen for the sake of two props.

`nautical.png` is Platformer Pack Nautical's own `nautical_tilesheet.png`
unchanged -- it is already an even 18x15 grid of 70px cells.
