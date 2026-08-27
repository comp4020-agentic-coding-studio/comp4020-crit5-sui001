// One parameterized universe scene, not three -- obstacle/resource/
// collision/upgrade logic is identical across modes; only gravity, camera,
// and steering input differ, so that's all this abstraction carries.

import type { GameObj, KAPLAYCtx } from "kaplay";
import type { ViewMode } from "./universes";

const LATERAL_SPEED = 160;

export interface ViewModeConfig {
  gravity: number;
  playerStartY(k: KAPLAYCtx): number;
  setupCamera(k: KAPLAYCtx, player: GameObj<any>): void;
  steerInput(k: KAPLAYCtx, player: GameObj<any>): void;
}

export const VIEW_MODES: Record<ViewMode, ViewModeConfig> = {
  topdown: {
    gravity: 0,
    playerStartY: (k) => k.height() / 2,
    setupCamera: () => {},
    steerInput: (k, player) => {
      if (k.isKeyDown("up")) player.move(0, -LATERAL_SPEED);
      if (k.isKeyDown("down")) player.move(0, LATERAL_SPEED);
    },
  },

  platformer: {
    gravity: 1600,
    playerStartY: (k) => k.height() - 80,
    setupCamera: (k, player) => {
      k.onUpdate(() => k.camPos(player.pos));
    },
    steerInput: (k, player) => {
      if (k.isKeyDown("space") && player.isGrounded()) player.jump();
    },
  },

  diorama: {
    gravity: 0,
    playerStartY: (k) => k.height() / 2,
    setupCamera: () => {},
    steerInput: (k, player) => {
      if (k.isKeyDown("up")) player.move(0, -LATERAL_SPEED * 0.4);
      if (k.isKeyDown("down")) player.move(0, LATERAL_SPEED * 0.4);
    },
  },
};
