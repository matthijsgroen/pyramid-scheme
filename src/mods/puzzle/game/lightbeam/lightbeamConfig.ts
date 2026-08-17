import type { Difficulty } from "@/data/difficultyLevels"
import type { LightbeamOptions } from "./generateLightbeam"

// Tier settings, from docs/game-design/puzzles/lightbeam.md §6. Every tier gets a full configuration:
// this family is not gated to a debut tier, because a starter corridor can sit behind a ward gate deep
// inside a wizard pyramid, so a starter board is not only ever seen by a beginner. Starter is therefore
// gentle rather than empty — a real route to find, just a short one with a low cap.
//
// The cap is the dial that carries the difficulty, as everywhere: it is what a board may DEMAND. Turn
// count and decoy count shape how a board feels; the cap is what it costs to solve.
//
// 7 wide is the ceiling, matching the other grid families: inside a 360px encounter modal there are no
// gutters to reclaim here, so a cell is simply the board over N, and an eighth column drops under a
// thumb's width (docs/instructions/puzzle-screens.md §1).
export const LIGHTBEAM_CONFIG: Record<Difficulty, { size: number } & LightbeamOptions> = {
  starter: { size: 5, turns: 2, techniqueCap: "deadEnd" },
  junior: { size: 5, turns: 3, setMirrors: 1, slidingMirrors: 1, shadows: 1, techniqueCap: "feedsExit" },
  expert: {
    size: 6,
    turns: 3,
    slidingMirrors: 1,
    slidingWalls: 1,
    decoys: 1,
    shadows: 1,
    techniqueCap: "neverReached",
  },
  master: {
    size: 6,
    turns: 4,
    setMirrors: 1,
    slidingMirrors: 1,
    slidingWalls: 1,
    decoys: 1,
    shadows: 1,
    techniqueCap: "onlySurvivor",
  },
  wizard: {
    size: 7,
    turns: 5,
    setMirrors: 1,
    slidingMirrors: 2,
    slidingWalls: 1,
    decoys: 1,
    shadows: 2,
    techniqueCap: "onlySurvivor",
  },
}
