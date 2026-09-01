# Tilesets

Four Kenney CC0 packs, each shipped as one packed sheet so a tile index is a
kaplay sprite frame (see `assets.ts`): Scribble Dungeons, Platformer Pack
Nautical, Hexagon Base Pack, Space Station Kit. Two themes are cut from each,
which is what `themes.ts` means by a sheet having more than one place in it.
`LICENSE.txt` is Kenney's and covers all four.

None of these are the 16px pixel art this project started on -- they run 64-92px
-- which is what `Theme.tileW` exists for. Without it a 70px tile draws four
grid cells wide.

## Sheets built rather than shipped

`scribble-dungeon.png`, `hexagon-base.png` and `space-station.png` are built by
`scripts/pack-tileset.mjs` from their packs' loose PNGs. That script is the
authoritative record of which frame is what: the roster order in it *is* the
frame numbering, so read it rather than counting squares in an image.

- **Scribble Dungeons** does ship a 14x11 sheet, but it is laid out for a human
  reading a contact sheet -- roles aren't grouped, and the four character
  tokens aren't on it at all. `Theme.player` has to be a frame on the theme's
  own sheet, so the sheet is rebuilt from the semantically named loose files
  into an 8x5 grid: ground and routes, props, props, pickups and players, then
  a row of spare surfaces.
- **Hexagon Base Pack** has no uniform sheet anywhere -- only irregular
  TexturePacker atlases -- but every terrain tile is cropped to the same 65x89
  box, so one can be built. Cells are 92px (the tallest asset used is a 65x91
  rock); the `_mid`/`_high` trees are left out because at 107px they would have
  pushed every hex a further 16px apart on screen for the sake of two props.
  Its flower pickups are upscaled in the packer: they are 12px decorations that
  would otherwise land as 6px targets.
- **Space Station Kit** is filed under `3D assets/`, and its `Models/` folder is
  glb/fbx/obj. `Previews/` next door holds a rendered 64x64 PNG of every model,
  transparent and semantically named -- a better-formed tileset than either of
  the two above, needing no 3D rendering at all. It is simply not where you
  would think to look for one, which is why this pack was written off once
  before being used.

`nautical.png` is Platformer Pack Nautical's own `nautical_tilesheet.png`
unchanged -- it is already an even 18x15 grid of 70px cells.

## Regenerating

    node scripts/pack-tileset.mjs                  # all built sheets
    node scripts/pack-tileset.mjs hexagon-base     # just one

The script reads from a Kenney bundle path hard-coded at its top; it is a
one-time authoring tool, not part of `pnpm build`.
