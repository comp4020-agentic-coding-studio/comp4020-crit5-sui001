# Crit 5 --- A game

**What was the breakthrough that moved the work forward?**

The loop worked before it was a game. Pickups scored, currency banked, the
shop bought upgrades --- and it was still boring, because nothing you did
could be wrong. The breakthrough was realising the fix wasn't more content,
it was a shared clock: putting one beat under the music, the grab bonus, and
the pickup pulse meant timing became the skill instead of decoration. That
one change (`beat.ts`) is what made hazards and decoys worth adding at all
--- without a beat to read, a hazard is just a trap, not a rhythm to learn.

**What did this work change about who I want to be as a software developer?**

I aimed at a game and shipped a scoring loop with scenery. The gap is worth
naming rather than just calling the result bad: most of the effort went into
asset archaeology --- hunting sprite packs, working out which of 240 numbered
tiles was a diving helmet, writing an image compositor from scratch --- and
very little into making it play well. For what this cost in credits and
attention I could have spent $100 in an app store and come away with a shelf of
finished games instead of one unfinished one.

I wouldn't repeat this task in this shape, and the useful part of saying so is
what I'd change. Not "work harder" --- scope ambition against the effort
actually available, and watch which parts of the workflow pay rent. Keeping a
theme as pure data paid: three new tilesets were additive, and the existing
tests fanned out over them for free. The archaeology was the part I enjoyed and
the part that ate the week --- exactly the combination I'm worst at noticing. I
want to spot that trade while there's still time to make it, not at the end
when all that's left is describing it.
