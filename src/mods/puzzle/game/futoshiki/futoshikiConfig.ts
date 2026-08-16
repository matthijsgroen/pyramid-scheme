import type { Difficulty } from "@/data/difficultyLevels"
import type { FutoshikiOptions } from "./generateFutoshiki"

// Tier settings, from docs/game-design/puzzles/futoshiki.md §5. Two dials, and the cap is the one that
// carries the difficulty: it is what a board may DEMAND of the player. How many signs a board ends up
// showing follows from it rather than being set here — a weak ladder cannot spare many, a strong one
// strips the board bare. 7 wide is the ceiling, matching Puzzle Express: with the signs laid over the
// gutters rather than given tracks of their own, seven squares still measure a thumb across inside a
// 360px modal, and an eighth would not.
export const FUTOSHIKI_CONFIG: Record<Difficulty, { size: number } & FutoshikiOptions> = {
  starter: { size: 4, techniqueCap: "signVsValue" },
  junior: { size: 5, techniqueCap: "signChain" },
  expert: { size: 6, techniqueCap: "signChain" },
  master: { size: 6, techniqueCap: "signPair" },
  wizard: { size: 7, techniqueCap: "nakedPair" },
}
