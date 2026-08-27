# Tilesets

Kenney CC0 packs, each shipped as one packed 16px sheet so a tile index is a
kaplay sprite frame (see `assets.ts`): Tiny Town, Tiny Farm, Tiny Dungeon,
Tiny Ski, Tiny Battle. `LICENSE.txt` is Kenney's, and covers all of them.

`tiny-farm.png` is the one sheet that is not byte-identical to its pack. Tiny
Farm is an overlay set -- every flat tile in it is a soil bed or a barn-roof
slope, so it has nothing that can serve as ground, and a level generated on it
came out as a field of repeating lozenges. A 12th row was appended carrying
seven ground tiles copied from Tiny Town (3 grass, 4 dirt), which is why the
farm themes declare `rows: 12` and index frames 132-138. Same author, same
licence, same palette, so the seam does not show.
