// Centralizes every loadSprite call behind one loadAssets(), called once
// before the first go(). Every pack here ships individual per-sprite PNGs
// (or a named XML atlas) rather than a raw grid sheet, so no atlas-JSON
// conversion step is needed -- plain loadSprite(name, path) is enough.
// All art is Kenney's CC0 "Game Assets All-in-1" bundle.

import type { KAPLAYCtx } from "kaplay";

export function loadAssets(k: KAPLAYCtx): void {
  k.loadSprite("ship", "sprites/simple-space/ship_A.png");
  k.loadSprite("meteor", "sprites/simple-space/meteor_detailedLarge.png");
  k.loadSprite("star", "sprites/simple-space/star_small.png");

  k.loadSprite("beige", "sprites/new-platformer/character_beige_idle.png");
  k.loadSprite("rock", "sprites/new-platformer/rock.png");
  k.loadSprite("coin", "sprites/new-platformer/coin_gold.png");

  k.loadSprite("lightpost", "sprites/isometric-medieval-town/lightpost_01_0.png");
  k.loadSprite("castleWall", "sprites/isometric-medieval-town/castle_wall_01_0.png");
  k.loadSprite("banner", "sprites/isometric-medieval-town/banner_01_0.png");

  k.loadSprite("tree", "sprites/foliage/foliagePack_010.png");
  k.loadSprite("flower", "sprites/foliage/foliagePack_001.png");
}
