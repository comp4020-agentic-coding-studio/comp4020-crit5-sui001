# Process overview

A reading-guide to how the work came together --- a map to your process, not an
essay about it. Markers read this file and follow its citations; they don't
trawl the repo for evidence you didn't point at, so if a moment mattered, cite
it.

This file is the shape; the course site's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
is the requirement, and its
[word counts](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts)
cover every deliverable.

## What I built

A top-down/garden/shop game built on kaplay: the player runs a tile-based
level grabbing pickups on a shared beat, banks currency between runs to buy
synergy upgrades, and the whole thing plays without a tutorial screen ever
telling you the rules.

## The moments that mattered

1. **Turning the "no tutorial" spec line into a gate before writing the loop.**
   The brief bans a tutorial screen, which is easy to violate by accident once
   you're deep in level code and reach for "just add a hint." I wrote
   `spec/level.test.ts`'s no-tutorial contract test before the top-down loop
   existed, so the loop had to be legible from tile layout and pickup
   placement alone, not from a check added after the fact.
   [`34e534a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-sui001/commit/34e534a)

2. **Every lit thing was good, so nothing was a decision.** Once the top-down
   loop was scoring, I noticed a miss cost nothing and every pickup was safe
   --- there was no moment where pressing the button could be wrong. Rather
   than tune numbers, I added a beat clock (`beat.ts`) that everything hangs
   off, and hazards/decoys (`pickups.ts`) that render like a spark until
   you're on top of them, so combo scoring rewards reading the beat instead of
   mashing the button.
   [`20c1b54`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-sui001/commit/20c1b54)

3. **A font bug the test suite couldn't have caught.** Looking at the deployed
   canvas at a non-1:1 window size, "Pickup" rendered as "Pirkup" --- kaplay's
   bitmap font losing pixel columns under fractional CSS scaling. `pnpm check`
   was green the whole time; only opening the page and looking at it surfaced
   it. Fixed by snapping the canvas to a whole-number scale (`fit-canvas.ts`)
   instead of trying to patch the font.
   [`20c1b54`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-sui001/commit/20c1b54)

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
