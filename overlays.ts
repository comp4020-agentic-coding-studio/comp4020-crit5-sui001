// Full-screen modal overlays: pause, and the buttons that leave a run.
// Shares the checkpoint's shape but not its meaning -- the checkpoint is a
// story beat that fires once, this is furniture the player can reach any time.

import type { KAPLAYCtx } from "kaplay";
import { UI_FONT } from "./assets";
import { sfx } from "./sfx";

const PAUSE_TAG = "pause-overlay";

export function isPauseOpen(k: KAPLAYCtx): boolean {
  return k.get(PAUSE_TAG).length > 0;
}

export function closePause(k: KAPLAYCtx): void {
  for (const obj of k.get(PAUSE_TAG)) k.destroy(obj);
}

interface Choice {
  label: string;
  colour: [number, number, number];
  act: () => void;
}

export function showPause(k: KAPLAYCtx, onResume: () => void, onQuit: () => void): void {
  if (isPauseOpen(k)) return;

  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(0.82),
    k.fixed(),
    k.z(120),
    PAUSE_TAG,
  ]);

  k.add([
    k.text("Held still.", { size: 38, font: UI_FONT }),
    k.pos(k.width() / 2, k.height() / 2 - 96),
    k.anchor("center"),
    k.fixed(),
    k.z(121),
    k.color(255, 255, 255),
    PAUSE_TAG,
  ]);

  const choices: Choice[] = [
    { label: "keep going", colour: [70, 120, 70], act: onResume },
    { label: "end the run", colour: [150, 70, 70], act: onQuit },
  ];

  choices.forEach((choice, i) => {
    const w = 240;
    const h = 58;
    const x = k.width() / 2 + (i === 0 ? -w - 12 : 12);
    const y = k.height() / 2 - h / 2 + 10;

    const btn = k.add([
      k.rect(w, h),
      k.pos(x, y),
      k.color(...choice.colour),
      k.area(),
      k.fixed(),
      k.z(121),
      PAUSE_TAG,
    ]);
    k.add([
      k.text(choice.label, { size: 20, font: UI_FONT }),
      k.pos(x + w / 2, y + h / 2),
      k.anchor("center"),
      k.fixed(),
      k.z(122),
      k.color(255, 255, 255),
      PAUSE_TAG,
    ]);

    btn.onClick(() => {
      sfx(k, "buy");
      // Deferred for the same reason the HUD defers: tearing down the object
      // that is mid-click-dispatch, and adding its replacement, re-enters the
      // handler in the same dispatch.
      k.wait(0, () => {
        closePause(k);
        choice.act();
      });
    });
  });
}
