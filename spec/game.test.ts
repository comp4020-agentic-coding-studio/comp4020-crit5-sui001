import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { isObstacleCleared } from "../rules";

// Runs against the BUILT site, same as spec/invariants.test.ts.
const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window
  .document;

// crit-5 spec: "it teaches itself: no instructions anywhere, on screen or
// off --- the opening screen invites the first move, and play teaches
// whatever comes next." This is the one line of the no-tutorial rule that's
// mechanically checkable: no visible text coaching the player on how to play.
// The rest of the rule (does the opening screen actually make the first move
// obvious?) only a person can judge -- that's on you and your pod at the crit.
describe("crit-5: no tutorial anywhere on screen", () => {
  const bannedMarkers = /how to play|instructions|tutorial|controls?:|press\s+\w+\s+to/i;

  it("has no element flagged as instructional", () => {
    const flagged = doc.querySelector(
      '[id*="instructions" i], [class*="instructions" i], [id*="tutorial" i], [class*="tutorial" i], [id*="how-to-play" i], [class*="how-to-play" i]',
    );
    expect(flagged, `found an instructional element: ${flagged?.outerHTML}`).toBeNull();
  });

  it("has no visible copy coaching the player on how to play", () => {
    const text = doc.body.textContent ?? "";
    expect(bannedMarkers.test(text), `page text matched a tutorial marker: "${text}"`).toBe(
      false,
    );
  });
});

// crit-5 spec: "one rule of the game has a focused automated test." The core
// rule is the obstacle-clear condition, pulled out of the rendering/Kaplay
// glue into a plain function (rules.ts) so it's testable with no DOM/canvas.
describe("crit-5: the core rule under test", () => {
  it("stays blocked below threshold", () => {
    expect(isObstacleCleared(2, 3)).toBe(false);
  });

  it("clears exactly at threshold", () => {
    expect(isObstacleCleared(3, 3)).toBe(true);
  });

  it("stays cleared above threshold", () => {
    expect(isObstacleCleared(5, 3)).toBe(true);
  });

  it("treats a zero threshold as already cleared", () => {
    expect(isObstacleCleared(0, 0)).toBe(true);
  });
});
