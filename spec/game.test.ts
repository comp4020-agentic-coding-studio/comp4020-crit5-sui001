import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

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

// crit-5 spec: "one rule of the game has a focused automated test." This is
// yours to fill in once the mechanic exists -- pull the core rule (the
// collision, the scoring threshold, the move that ends the round) out of the
// rendering/Kaplay glue into a plain function you can call directly here.
describe.todo("crit-5: the core rule under test");
