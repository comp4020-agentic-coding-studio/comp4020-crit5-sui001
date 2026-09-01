// A twist rolled per universe, on top of its theme. Two lagoons should not
// play the same, and eight themes stop being eight experiences very quickly if the
// only thing changing is the wallpaper.
//
// Pure data plus one roll function, so spec/modifiers.test.ts can assert every
// entry stays inside sane bounds -- a modifier that scaled reach to zero would
// generate a universe nobody can clear.

import { random as defaultRandom } from "./rng";

export interface Modifier {
  id: string;
  /** Shown as a small badge. A name is not an instruction; the effect is felt. */
  name: string;
  reachScale: number;
  speedScale: number;
  sparkScale: number;
  /** Added to the generator's chance that any given pickup is harmful. */
  hazardBias: number;
  /** Scales how many pickups get placed beyond the guaranteed safe ones. */
  pickupScale: number;
  /** Red is good and bright is bad. */
  inverted: boolean;
  /** No score, so the beat has to be felt rather than heard. */
  silent: boolean;
  badge: [number, number, number];
}

const BASE: Omit<Modifier, "id" | "name" | "badge"> = {
  reachScale: 1,
  speedScale: 1,
  sparkScale: 1,
  hazardBias: 0,
  pickupScale: 1,
  inverted: false,
  silent: false,
};

export const MODIFIERS: readonly Modifier[] = [
  { ...BASE, id: "steady", name: "steady", badge: [150, 170, 190] },
  { ...BASE, id: "fog", name: "fog", reachScale: 0.72, badge: [130, 150, 170] },
  { ...BASE, id: "rush", name: "rush", speedScale: 1.45, sparkScale: 2, badge: [255, 170, 70] },
  {
    ...BASE,
    id: "infestation",
    name: "infestation",
    hazardBias: 0.28,
    pickupScale: 1.3,
    badge: [230, 80, 80],
  },
  { ...BASE, id: "famine", name: "famine", pickupScale: 0.55, sparkScale: 2.5, badge: [190, 160, 90] },
  { ...BASE, id: "dead air", name: "dead air", silent: true, sparkScale: 1.6, badge: [120, 120, 140] },
  {
    ...BASE,
    id: "inversion",
    name: "inversion",
    inverted: true,
    sparkScale: 1.8,
    badge: [190, 100, 230],
  },
];

// "steady" is deliberately the most common roll: a twist stops reading as a
// twist if every universe has one.
const STEADY_WEIGHT = 3;

let lastId: string | null = null;

export function rollModifier(random: () => number = defaultRandom): Modifier {
  const pool: Modifier[] = [];
  for (const modifier of MODIFIERS) {
    const weight = modifier.id === "steady" ? STEADY_WEIGHT : 1;
    for (let i = 0; i < weight; i++) pool.push(modifier);
  }
  const fresh = pool.filter((m) => m.id !== lastId);
  const options = fresh.length > 0 ? fresh : pool;
  const picked = options[Math.floor(random() * options.length)];
  lastId = picked.id;
  return picked;
}

export function resetModifierHistory(): void {
  lastId = null;
}
