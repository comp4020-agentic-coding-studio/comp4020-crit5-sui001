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

I keep reaching for "add more" when a system feels flat, and this week that
instinct was wrong twice: once for the difficulty (the fix was one shared
clock, not more pickup types), and once for a bug the test suite couldn't
see (a font rendering bug only showed up by opening the page at an odd window
size, not in a green `pnpm check`). I want to get better at treating "it
passes" and "it feels right" as two different questions that need two
different kinds of looking, and reaching for the smallest structural fix
before reaching for more surface area.
