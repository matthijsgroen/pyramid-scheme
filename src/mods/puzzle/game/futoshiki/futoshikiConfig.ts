import type { Difficulty } from "@/data/difficultyLevels"
import type { FutoshikiOptions } from "./generateFutoshiki"

// Tier settings, from docs/game-design/puzzles/futoshiki.md §5. Two dials, and the cap is the honest
// one: it is what a board may DEMAND of the player. The prune fraction decides how many signs survive,
// which is the same dial seen from the board's side — a heavily signed grid reads itself out, a thin
// one has to be reasoned into. 7 wide is the ceiling, matching Puzzle Express: with the signs laid
// over the gutters rather than given tracks of their own, seven squares still measure a thumb across
// inside a 360px modal, and an eighth would not.
export const FUTOSHIKI_CONFIG: Record<Difficulty, { size: number } & FutoshikiOptions> = {
  starter: { size: 4, techniqueCap: "signVsValue", pruneFraction: 0.35 },
  junior: { size: 5, techniqueCap: "signChain", pruneFraction: 0.7 },
  expert: { size: 6, techniqueCap: "signChain", pruneFraction: 0.8 },
  master: { size: 6, techniqueCap: "signPair", pruneFraction: 1 },
  wizard: { size: 7, techniqueCap: "nakedPair", pruneFraction: 1 },
}
