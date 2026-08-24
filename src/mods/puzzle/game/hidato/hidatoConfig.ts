import type { Difficulty } from "@/data/difficultyLevels"
import type { HidatoOptions } from "./generateHidato"

// Tier settings, from docs/game-design/puzzles/hidato.md §5. Three dials, answering three questions:
// how big the comb is, how much of the run is handed over, and how hard the board is allowed to read.
//
// The comb stays inside a radius-3 hexagon — seven cells across, which is what a 360px screen fits at
// a thumb's width (docs/instructions/puzzle-screens.md §1) — everywhere except wizard, which spends
// that room on a ring further out and is the only tier that does (design doc §5.1).
//
// **The reading only steps up once**, because the ladder only has two rungs (techniques.ts's note on
// PRUNINGS says why the third was dropped). So the first three tiers grow the comb and hand over less
// of the run, and the last two are where a board may demand that a whole run be threaded through a
// corridor. `requires` makes that a guarantee rather than a hope: the board has to stall without it.
export const HIDATO_CONFIG: Record<Difficulty, HidatoOptions> = {
  // Half the run written in, on a comb small enough to hold in the eye. Nothing here needs more than
  // "which open cell touches this number", which is the rule of the family said once.
  starter: { radius: 2, cells: 14, pruning: "adjacency", givens: 7 },
  // The full hexagon at the same reading — bigger to look at, no new reason to find.
  junior: { radius: 2, cells: 19, pruning: "adjacency", givens: 8, wander: 0.3, rimStreak: 5 },
  expert: { radius: 3, cells: 26, pruning: "adjacency", givens: 9, wander: 0.35, rimStreak: 4 },
  // The whole radius-3 hive: 37 cells, and a run that has to be threaded rather than followed.
  master: { radius: 3, cells: 37, pruning: "gapPath", givens: 9, requires: "gapPath", wander: 0.4, rimStreak: 3 },
  // A ring further out — 61 cells, nine across (design doc §5.1).
  //
  // The rim allowance goes UP with the ring rather than staying put: 4 of a 24-cell ring is the same
  // share of it as 3 of an 18-cell one, and holding the old number here halved the first-attempt yield
  // (52% against 97%) without buying any more twist.
  wizard: { radius: 4, cells: 61, pruning: "gapPath", givens: 12, requires: "gapPath", wander: 0.45, rimStreak: 4 },
}
