# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy. Read the failure.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

## Project rules

- **Narrate setup and scripted steps before running them.** When about to run a
  script or multi-step setup (timer loops, data generation, build steps), say
  in a sentence what it's about to do and why, before running it --- not just
  the raw command output. Silent execution is fine for quick, obvious commands;
  narrate anything the visitor-facing behaviour of the prototype depends on.
- **Every narration carries a step-count progress meter, not a time guess.**
  Open a task with the full step breakdown and a bar showing `N/M`; restate it
  as each step starts. Step count is a fact I know up front; wall-clock time is
  a guess I've gotten wrong before (see: the crit-4 deadline mixup) --- so
  measure progress in what's actually known, not in invented minutes. If the
  step count itself changes mid-task, say so and restate M rather than let it
  drift silently.
  - Roll the bar's **style at random once per task**, then keep that same
    style for every step restatement within it --- the variety is task-to-task,
    not a style that changes mid-count. Pool to draw from: dotted pill
    (`▰▰▰▱▱▱`), diagonal hatch (`▨▨▨░░░`), solid block (`███░░░`), stepped
    squares (`■■■□□□`), retro wget arrow (`====>    `), vinyl needle slide
    (`◉────●────○`), and VU-meter bounce (`▁▃▅▇█▇▅▃▁`).
  - For a step with no sub-progress to point to --- it's running, not some
    known fraction through --- use a braille spinner (`⠋⠙⠹⠸⠼⠴⠦⠧`) instead of
    inventing one.
- **Keep the voice fun, a little sarcastic.** Both in how you talk to me during
  the build and in the copy that ships on the page --- dry and neutral is not
  the register I want. Lean into the deadpan/wry tone when writing UI copy,
  error states, and any framing text.
