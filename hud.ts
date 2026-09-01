// Manual fixed()-overlay UI -- kaplay has no built-in button/list widget.
// Re-rendered wholesale on every change rather than diffed, which is fine at
// this list size.

import type { KAPLAYCtx } from "kaplay";
import { ABILITIES, readiness } from "./abilities";
import { UI_FONT } from "./assets";
import { multiplierFor } from "./combo";
import { cycleAutoTarget, setAutoCollect, setMusicEnabled, setReducedMotion, setSfxEnabled, settings } from "./settings";
import { sfx } from "./sfx";
import type { RunState } from "./state";
import type { UpgradeDef } from "./upgrades";
import { UPGRADES, buyUpgrade, canBuyUpgrade, isUnlocked, upgradeCost, upgradeLevel } from "./upgrades";

const HUD_TAG = "hud";
const PANEL = [10, 12, 20] as const;
const PANEL_W = 424;

// Rebuilding the HUD from inside a button's own click handler destroys that
// button and adds its replacement while kaplay is still dispatching the click,
// so the fresh handler fires in the same dispatch and does it all again. The
// upgrade buttons got away with it because buyUpgrade() refuses the second
// pass; the audio toggles did not, and recursed until the tab locked up under
// thousands of queued sounds. Handlers now ask for a rebuild on the next frame,
// and repeat requests inside one frame collapse into a single render.
let renderQueued = false;

// Set by hover handlers only -- never triggers a rebuild, for the same reason.
let hovered: UpgradeDef | null = null;

function queueRender(k: KAPLAYCtx, state: RunState): void {
  if (renderQueued) return;
  renderQueued = true;
  k.wait(0, () => {
    renderQueued = false;
    renderHud(k, state);
  });
}

export function renderHud(k: KAPLAYCtx, state: RunState, onPause?: () => void): void {
  for (const obj of k.get(HUD_TAG)) k.destroy(obj);

  const rows = UPGRADES.filter((def) => isUnlocked(state, def)).length;

  // Backing plate: the tilesets are busy and light, and white text straight
  // over a snowfield is unreadable.
  k.add([
    k.rect(PANEL_W, 44 + rows * 38),
    k.pos(10, 10),
    k.color(...PANEL),
    k.opacity(0.93),
    k.fixed(),
    k.z(90),
    HUD_TAG,
  ]);

  k.add([
    k.text(`sparks ${state.currency}`, { size: 22, font: UI_FONT }),
    k.pos(20, 16),
    k.fixed(),
    k.z(91),
    k.color(255, 255, 255),
    HUD_TAG,
  ]);

  // Pending sparks are the push-your-luck number: earned, not yet kept.
  if (state.pending > 0) {
    k.add([
      k.text(`+${state.pending} pending`, { size: 18, font: UI_FONT }),
      k.pos(PANEL_W - 10, 20),
      k.anchor("topright"),
      k.fixed(),
      k.z(91),
      k.color(255, 210, 110),
      HUD_TAG,
    ]);
  }

  let row = 0;
  for (const def of UPGRADES) {
    if (!isUnlocked(state, def)) continue;

    const level = upgradeLevel(state, def.id);
    const maxed = level >= def.maxLevel;
    const cost = upgradeCost(state, def);
    const affordable = canBuyUpgrade(state, def);
    const label = maxed ? `${def.name} (maxed)` : `${def.name} -- ${cost} (Lv ${level})`;
    const y = 50 + row * 38;
    row++;

    const btn = k.add([
      k.rect(400, 32),
      k.pos(16, y),
      k.color(affordable ? 60 : 34, affordable ? 100 : 38, affordable ? 60 : 46),
      k.opacity(maxed ? 0.5 : 1),
      k.area(),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);

    k.add([
      k.text(label, { size: 17, font: UI_FONT }),
      k.pos(26, y + 8),
      k.fixed(),
      k.z(92),
      k.color(255, 255, 255),
      HUD_TAG,
    ]);

    // Every upgrade has carried a `description` since the shop was written and
    // it has never once been shown, which is why buying one felt like nothing
    // happened.
    btn.onHover(() => {
      hovered = def;
    });
    btn.onHoverEnd(() => {
      if (hovered === def) hovered = null;
    });

    if (!maxed) {
      btn.onClick(() => {
        if (!buyUpgrade(state, def.id)) return;
        sfx(k, "buy");
        queueRender(k, state);
      });
    }
  }

  renderTooltip(k, 44 + rows * 38 + 16);
  renderAbilities(k, state);
  renderProgress(k, state);
  renderStreak(k, state);
  renderThreat(k, state);
  renderButtons(k, state, onPause);
}

function renderTooltip(k: KAPLAYCtx, y: number): void {
  k.add([
    k.pos(0, 0),
    k.fixed(),
    k.z(95),
    HUD_TAG,
    {
      draw() {
        if (!hovered) return;
        const width = PANEL_W;
        const height = 84;
        k.drawRect({
          pos: k.vec2(10, y),
          width,
          height,
          color: k.rgb(8, 10, 16),
          opacity: 0.96,
        });
        k.drawText({
          text: hovered.name,
          size: 17,
          font: UI_FONT,
          pos: k.vec2(22, y + 10),
          color: k.rgb(255, 225, 130),
        });
        k.drawText({
          text: hovered.description,
          size: 15,
          font: UI_FONT,
          pos: k.vec2(22, y + 34),
          width: width - 24,
          color: k.rgb(210, 214, 224),
        });
      },
    },
  ]);
}

// Cooldown chips, drawn live rather than rebuilt: a cooldown changes every
// frame and the HUD only re-renders on events. Only unlocked abilities appear,
// so the row is empty until the shop puts something in it.
function renderAbilities(k: KAPLAYCtx, state: RunState): void {
  const owned = ABILITIES.filter((def) => (state.upgrades[def.upgrade] ?? 0) > 0);
  if (owned.length === 0) return;

  const w = 96;
  const h = 34;
  const gap = 10;
  const y = k.height() - 92;

  k.add([
    k.pos(0, 0),
    k.fixed(),
    k.z(93),
    HUD_TAG,
    {
      draw() {
        owned.forEach((def, i) => {
          const x = 16 + i * (w + gap);
          const ready = readiness(state.cooldowns, def, k.time());
          k.drawRect({ pos: k.vec2(x, y), width: w, height: h, color: k.rgb(16, 18, 28), opacity: 0.9 });
          k.drawRect({
            pos: k.vec2(x, y),
            width: w * ready,
            height: h,
            color: ready >= 1 ? k.rgb(70, 120, 90) : k.rgb(60, 70, 100),
            opacity: 0.95,
          });
          k.drawText({
            text: `${def.key.toUpperCase()}  ${def.name}`,
            size: 14,
            font: UI_FONT,
            pos: k.vec2(x + 9, y + 10),
            color: ready >= 1 ? k.rgb(255, 255, 255) : k.rgb(160, 170, 190),
          });
        });
      },
    },
  ]);
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
    k.opacity(0.93),
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

  // The universe's twist, as a coloured badge. A name is not an instruction --
  // what it DOES is still only learnable by playing it.
  if (state.modifier && state.modifier.id !== "steady") {
    const [r, g, b] = state.modifier.badge;
    k.add([
      k.text(state.modifier.name, { size: 16, font: UI_FONT }),
      k.pos(k.width() / 2, y + dot + 18),
      k.anchor("center"),
      k.fixed(),
      k.z(92),
      k.color(r, g, b),
      HUD_TAG,
    ]);
  }
}

function renderStreak(k: KAPLAYCtx, state: RunState): void {
  if (state.combo < 2) return;

  const multiplier = multiplierFor(state.combo);
  const hot = multiplier >= 3;
  k.add([
    k.text(`x${multiplier}  ${state.combo}`, { size: 26, font: UI_FONT }),
    k.pos(k.width() / 2, 74),
    k.anchor("center"),
    k.fixed(),
    k.z(92),
    k.color(255, hot ? 200 : 240, hot ? 90 : 160),
    HUD_TAG,
  ]);
}

// How close the thing behind you is. A bar rather than a number: it only has
// to read as "getting worse" at a glance while you're busy looking at the road.
function renderThreat(k: KAPLAYCtx, state: RunState): void {
  // During the run for the exit, the bar stops being "how close is it" and
  // becomes "how much further" -- one bar, because they are never both the
  // question at once.
  if (state.escaping) {
    const w = 300;
    const h = 14;
    const x = k.width() / 2 - w / 2;
    const y = k.height() - 36;
    k.add([
      k.rect(w + 8, h + 8),
      k.pos(x - 4, y - 4),
      k.color(...PANEL),
      k.opacity(0.9),
      k.fixed(),
      k.z(90),
      HUD_TAG,
    ]);
    k.add([
      k.rect(Math.max(2, w * Math.max(0, Math.min(1, state.escape))), h),
      k.pos(x, y),
      k.color(255, 205, 90),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);
    k.add([
      k.text("get out", { size: 15, font: UI_FONT }),
      k.pos(k.width() / 2, y - 18),
      k.anchor("center"),
      k.fixed(),
      k.z(91),
      k.color(255, 215, 120),
      HUD_TAG,
    ]);
    return;
  }

  const w = 210;
  const h = 12;
  const x = k.width() / 2 - w / 2;
  const y = k.height() - 34;

  k.add([
    k.rect(w + 8, h + 8),
    k.pos(x - 4, y - 4),
    k.color(...PANEL),
    k.opacity(0.85),
    k.fixed(),
    k.z(90),
    HUD_TAG,
  ]);

  const filled = Math.max(0, Math.min(1, state.threat));
  if (filled > 0) {
    k.add([
      k.rect(Math.max(2, w * filled), h),
      k.pos(x, y),
      k.color(220, filled > 0.6 ? 60 : 140, 70),
      k.opacity(0.95),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);
  }
}

interface ToggleSpec {
  label: string;
  on: boolean;
  accent?: [number, number, number];
  act: () => void;
}

function renderButtons(k: KAPLAYCtx, state: RunState, onPause?: () => void): void {
  const items: ToggleSpec[] = [
    { label: `music ${settings.music ? "on" : "off"}`, on: settings.music, act: () => setMusicEnabled(!settings.music) },
    { label: `sound ${settings.sfx ? "on" : "off"}`, on: settings.sfx, act: () => setSfxEnabled(!settings.sfx) },
    { label: `auto ${settings.autoCollect ? "on" : "off"}`, on: settings.autoCollect, act: () => setAutoCollect(!settings.autoCollect) },
    // What the auto-collector reaches for. Matters most in an inverted
    // universe, where "safe" and "harmful" have swapped places.
    { label: `grab: ${settings.autoTarget}`, on: settings.autoCollect, act: () => cycleAutoTarget() },
    { label: `motion ${settings.reducedMotion ? "low" : "full"}`, on: !settings.reducedMotion, act: () => setReducedMotion(!settings.reducedMotion) },
  ];

  const w = 138;
  const h = 30;
  items.forEach((item, i) => {
    const x = k.width() - 14 - w;
    const y = 14 + i * (h + 6);

    const btn = k.add([
      k.rect(w, h),
      k.pos(x, y),
      k.color(item.on ? 58 : 40, item.on ? 96 : 44, item.on ? 68 : 52),
      k.opacity(0.95),
      k.area(),
      k.fixed(),
      k.z(91),
      HUD_TAG,
    ]);

    k.add([
      k.text(item.label, { size: 15, font: UI_FONT }),
      k.pos(x + 10, y + 8),
      k.fixed(),
      k.z(92),
      k.color(item.on ? 255 : 165, item.on ? 255 : 165, item.on ? 255 : 165),
      HUD_TAG,
    ]);

    btn.onClick(() => {
      item.act();
      sfx(k, "buy");
      queueRender(k, state);
    });
  });

  if (!onPause) return;
  const y = 14 + items.length * (h + 6) + 8;
  const x = k.width() - 14 - w;
  const btn = k.add([
    k.rect(w, h),
    k.pos(x, y),
    k.color(70, 62, 96),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(91),
    HUD_TAG,
  ]);
  k.add([
    k.text("pause", { size: 15, font: UI_FONT }),
    k.pos(x + 10, y + 8),
    k.fixed(),
    k.z(92),
    k.color(255, 255, 255),
    HUD_TAG,
  ]);
  btn.onClick(() => {
    sfx(k, "buy");
    onPause();
  });
}
