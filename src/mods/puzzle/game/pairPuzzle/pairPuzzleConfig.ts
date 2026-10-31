import type { Difficulty } from "@/data/difficultyLevels"
import type { PairOptions } from "./generatePairPuzzle"

// Tier settings, per docs/game-design/puzzles/pair-puzzle.md.
const MASTER: PairOptions = {
  size: 8,
  density: 0.17,
  techniqueCap: "lineBlock",
  requires: ["claimed", "lineBlock"],
  requiresCount: 2,
  firstPieceAfter: 1,
}

export const PAIR_PUZZLE_CONFIG: Record<Difficulty, PairOptions> = {
  // Unreachable below the family's minTier; the table is total, so these point at the gentlest real tier.
  starter: MASTER,
  junior: MASTER,
  expert: MASTER,
  master: MASTER,
  wizard: {
    size: 9,
    density: 0.17,
    techniqueCap: "wouldStrand",
    requires: ["wouldStrand"],
    requiresCount: 3,
  },
}
