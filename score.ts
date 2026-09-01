// What a finished run was worth, and what to call it. Pure so the summary
// screen and spec/score.test.ts agree by construction.

export interface RunTotals {
  currency: number;
  bestCombo: number;
  clearedUniverseCount: number;
  perfectBeats: number;
  hazardsDodged: number;
}

// Weights chosen so no single stat can carry a run on its own: banking is the
// baseline, but a player who never builds a streak or reads a hazard tops out
// well short of one who does.
export const WEIGHTS = {
  sparks: 1,
  streak: 6,
  universe: 45,
  perfectBeat: 3,
  dodged: 2,
} as const;

export function runScore(totals: RunTotals): number {
  return (
    totals.currency * WEIGHTS.sparks +
    totals.bestCombo * WEIGHTS.streak +
    totals.clearedUniverseCount * WEIGHTS.universe +
    totals.perfectBeats * WEIGHTS.perfectBeat +
    totals.hazardsDodged * WEIGHTS.dodged
  );
}

const GRADES: ReadonlyArray<{ min: number; grade: string }> = [
  { min: 1200, grade: "S" },
  { min: 800, grade: "A" },
  { min: 480, grade: "B" },
  { min: 240, grade: "C" },
  { min: 0, grade: "D" },
];

export function gradeFor(score: number): string {
  for (const band of GRADES) if (score >= band.min) return band.grade;
  return "D";
}
