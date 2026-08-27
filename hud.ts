// Manual fixed()-overlay UI -- kaplay has no built-in button/list widget.
// Re-rendered wholesale on every currency/upgrade change rather than
// diffed, which is fine at this list size.

import type { KAPLAYCtx } from "kaplay";
import type { RunState } from "./state";
import { UPGRADES, buyUpgrade, canBuyUpgrade, isUnlocked, upgradeCost, upgradeLevel } from "./upgrades";

const HUD_TAG = "hud";

export function renderHud(k: KAPLAYCtx, state: RunState): void {
  for (const obj of k.get(HUD_TAG)) k.destroy(obj);

  k.add([k.text(`sparks: ${state.currency}`, { size: 16 }), k.pos(12, 12), k.fixed(), k.color(255, 255, 255), HUD_TAG]);

  let row = 0;
  for (const def of UPGRADES) {
    if (!isUnlocked(state, def)) continue;

    const level = upgradeLevel(state, def.id);
    const maxed = level >= def.maxLevel;
    const cost = upgradeCost(state, def);
    const affordable = canBuyUpgrade(state, def);
    const label = maxed ? `${def.name} (maxed)` : `${def.name} -- ${cost} (Lv ${level})`;
    const y = 40 + row * 26;
    row++;

    const btn = k.add([
      k.rect(240, 22),
      k.pos(12, y),
      k.color(affordable ? 60 : 30, affordable ? 90 : 30, affordable ? 60 : 30),
      k.opacity(maxed ? 0.4 : 1),
      k.area(),
      k.fixed(),
      HUD_TAG,
    ]);

    k.add([k.text(label, { size: 12 }), k.pos(18, y + 4), k.fixed(), k.color(255, 255, 255), HUD_TAG]);

    if (!maxed) {
      btn.onClick(() => {
        if (buyUpgrade(state, def.id)) renderHud(k, state);
      });
    }
  }
}
