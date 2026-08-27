// Manual fixed()-overlay UI -- kaplay has no built-in button/list widget.
// Re-rendered wholesale on every currency/upgrade/progress change rather than
// diffed, which is fine at this list size.

import type { KAPLAYCtx } from "kaplay";
import { audioSettings, setMusicEnabled, setSfxEnabled } from "./audio";
import { sfx } from "./sfx";
import type { RunState } from "./state";
import { UPGRADES, buyUpgrade, canBuyUpgrade, isUnlocked, upgradeCost, upgradeLevel } from "./upgrades";

const HUD_TAG = "hud";
const PANEL = [10, 12, 20] as const;

export function renderHud(k: KAPLAYCtx, state: RunState): void {
  for (const obj of k.get(HUD_TAG)) k.destroy(obj);

  // Backing plate: the tilesets are busy and light, and white text straight
  // over a snowfield is unreadable.
  k.add([
    k.rect(360, 34 + UPGRADES.length * 36),
    k.pos(10, 10),
    k.color(...PANEL),
    k.opacity(0.72),
    k.fixed(),
    k.z(90),
    HUD_TAG,
  ]);

  k.add([
    k.text(`sparks: ${state.currency}`, { size: 22 }),
    k.pos(20, 16),
    k.fixed(),
    k.z(91),
    k.color(255, 255, 255),
    HUD_TAG,
  ]);

  let row = 0;
  for (const def of UPGRADES) {
    if (!isUnlocked(state, def)) continue;

    const level = upgradeLevel(state, def.id);
    const maxed = level >= def.maxLevel;
    const cost = upgradeCost(state, def);
    const affordable = canBuyUpgrade(state, def);
    const label = maxed ? `${def.name} (maxed)` : `${def.name} -- ${cost} (Lv ${level})`;
    const y = 50 + row * 36;
    row++;

    const btn = k.add([
      k.rect(340, 30),
      k.pos(16, y),
      k.color(affordable ? 60 : 34, affordable ? 100 : 38, affordable ? 60 : 46),
      k.opacity(maxed ? 0.4 : 0.95),
      k.area(),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);

    k.add([
      k.text(label, { size: 16 }),
      k.pos(24, y + 6),
      k.fixed(),
      k.z(92),
      k.color(255, 255, 255),
      HUD_TAG,
    ]);

    if (!maxed) {
      btn.onClick(() => {
        if (!buyUpgrade(state, def.id)) return;
        sfx(k, "buy");
        renderHud(k, state);
      });
    }
  }

  renderProgress(k, state);
  renderAudioToggles(k, state);
}

// Pips, not a "3/8 collected" label. The no-tutorial rule means the goal has
// to be shown rather than stated, and a row of sockets filling up says
// "collect this many" without a word of copy.
function renderProgress(k: KAPLAYCtx, state: RunState): void {
  if (state.threshold <= 0) return;

  const dot = 16;
  const gap = 8;
  const width = state.threshold * dot + (state.threshold - 1) * gap;
  const startX = k.width() / 2 - width / 2;
  const y = 22;

  k.add([
    k.rect(width + 28, dot + 20),
    k.pos(startX - 14, y - 10),
    k.color(...PANEL),
    k.opacity(0.72),
    k.fixed(),
    k.z(90),
    HUD_TAG,
  ]);

  for (let i = 0; i < state.threshold; i++) {
    const filled = i < state.collected;
    k.add([
      k.circle(dot / 2),
      k.pos(startX + i * (dot + gap) + dot / 2, y + dot / 2),
      k.color(filled ? 255 : 90, filled ? 220 : 96, filled ? 110 : 110),
      k.opacity(filled ? 1 : 0.5),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);
  }
}

function renderAudioToggles(k: KAPLAYCtx, state: RunState): void {
  const items: Array<{ label: string; on: boolean; toggle: () => void }> = [
    { label: "music", on: audioSettings.music, toggle: () => setMusicEnabled(!audioSettings.music) },
    { label: "sound", on: audioSettings.sfx, toggle: () => setSfxEnabled(!audioSettings.sfx) },
  ];

  const w = 96;
  const h = 30;
  items.forEach((item, i) => {
    const x = k.width() - 16 - w;
    const y = 16 + i * (h + 8);

    const btn = k.add([
      k.rect(w, h),
      k.pos(x, y),
      k.color(item.on ? 60 : 40, item.on ? 100 : 44, item.on ? 70 : 52),
      k.opacity(0.92),
      k.area(),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);

    k.add([
      k.text(`${item.label} ${item.on ? "on" : "off"}`, { size: 14 }),
      k.pos(x + 10, y + 8),
      k.fixed(),
      k.z(92),
      k.color(item.on ? 255 : 170, item.on ? 255 : 170, item.on ? 255 : 170),
      HUD_TAG,
    ]);

    btn.onClick(() => {
      item.toggle();
      sfx(k, "buy");
      renderHud(k, state);
    });
  });
}
