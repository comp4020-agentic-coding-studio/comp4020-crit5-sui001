// Fires once, on the first universe cleared -- not a wall-clock timer, so
// there's no timer bookkeeping and it always lands on a real beat. Offers a
// genuine "end here" so the spec's "ends somewhere" is honestly satisfied,
// with "keep going" continuing the incremental for anyone who wants more.

import type { KAPLAYCtx } from "kaplay";
import { UI_FONT } from "./assets";
import { sfx } from "./sfx";
import type { RunState } from "./state";

const CHECKPOINT_TAG = "checkpoint";

function showCheckpoint(k: KAPLAYCtx, state: RunState, onContinue: () => void): void {
  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(0.88),
    k.fixed(),
    CHECKPOINT_TAG,
  ]);

  k.add([
    k.text("One universe down. Call it five minutes of flickering.", {
      size: 24,
      font: UI_FONT,
      width: k.width() - 160,
      align: "center",
    }),
    k.pos(k.width() / 2, k.height() / 2 - 90),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
    CHECKPOINT_TAG,
  ]);

  const endBtn = k.add([
    k.rect(220, 56),
    k.pos(k.width() / 2 - 240, k.height() / 2 + 20),
    k.anchor("center"),
    k.color(150, 70, 70),
    k.area(),
    k.fixed(),
    CHECKPOINT_TAG,
  ]);
  k.add([
    k.text("end here", { size: 19, font: UI_FONT }),
    k.pos(k.width() / 2 - 240, k.height() / 2 + 20),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
    CHECKPOINT_TAG,
  ]);
  endBtn.onClick(() => {
    sfx(k, "buy");
    for (const obj of k.get(CHECKPOINT_TAG)) k.destroy(obj);
    k.go("ending");
  });

  const continueBtn = k.add([
    k.rect(220, 56),
    k.pos(k.width() / 2 + 20, k.height() / 2 + 20),
    k.anchor("center"),
    k.color(70, 120, 70),
    k.area(),
    k.fixed(),
    CHECKPOINT_TAG,
  ]);
  k.add([
    k.text("keep flickering", { size: 19, font: UI_FONT }),
    k.pos(k.width() / 2 + 20, k.height() / 2 + 20),
    k.anchor("center"),
    k.fixed(),
    k.color(255, 255, 255),
    CHECKPOINT_TAG,
  ]);
  continueBtn.onClick(() => {
    sfx(k, "buy");
    for (const obj of k.get(CHECKPOINT_TAG)) k.destroy(obj);
    state.paused = false;
    onContinue();
  });
}

// Returns whether the checkpoint fired -- main.ts skips its normal
// universe-jump wait when it did, since the buttons drive the jump instead.
export function maybeShowCheckpoint(k: KAPLAYCtx, state: RunState, onContinue: () => void): boolean {
  if (state.checkpointShown || state.clearedUniverseCount !== 1) return false;

  state.checkpointShown = true;
  state.paused = true;
  showCheckpoint(k, state, onContinue);
  return true;
}
