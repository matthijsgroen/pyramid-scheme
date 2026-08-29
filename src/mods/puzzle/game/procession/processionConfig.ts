import type { Difficulty } from "@/data/difficultyLevels"
import type { ProcessionOptions } from "./generateProcession"

/**
 * The ladder, tier by tier (`docs/game-design/puzzles/procession.md` §5).
 *
 * **The rung is the tier and the size is the bookkeeping.** A wider day and another bar do not make a
 * board harder — they make it longer — so what separates one tier from the next is which marks it may be
 * built from and, through them, the weakest rung that settles it. The sizes grow underneath because a
 * board needs enough web for the rung to have somewhere to happen.
 */
export const PROCESSION_CONFIG: Record<Difficulty, ProcessionOptions> = {
  // Pins and handoffs only: one bar is given, the next one hangs off it, and the day is short enough to
  // read at a glance. A first encounter teaches itself, because dragging any bar makes a bracket go red.
  starter: {
    ticks: 8,
    bars: 3,
    minLen: 2,
    maxLen: 3,
    maxGap: 2,
    kinds: ["pin", "link"],
    minRung: "chain",
    maxRung: "chain",
    minSplits: 0,
    maxSplits: 0,
  },
  // `before` arrives, and with it the first board that is not a chain: a bar that nothing points at, whose
  // place is what is left once the others have taken theirs.
  junior: {
    ticks: 10,
    bars: 4,
    minLen: 2,
    maxLen: 3,
    maxGap: 3,
    kinds: ["pin", "link", "before"],
    minRung: "squeeze",
    maxRung: "squeeze",
    minSplits: 0,
    maxSplits: 0,
  },
  // `apart` and `together` arrive. Both are read here on lengths alone — one order of a pair does not fit
  // — which is the last rung before a board asks the player to suppose something.
  expert: {
    ticks: 12,
    bars: 5,
    minLen: 2,
    maxLen: 4,
    maxGap: 3,
    kinds: ["pin", "link", "before", "apart", "together"],
    minRung: "apart",
    maxRung: "apart",
    minSplits: 0,
    maxSplits: 0,
  },
  // `span` arrives, and the board starts asking for one supposition: take one order of an `apart`, follow
  // it until it breaks, and the other order is the answer.
  master: {
    ticks: 14,
    bars: 5,
    minLen: 2,
    maxLen: 4,
    maxGap: 4,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "split",
    maxRung: "split",
    minSplits: 1,
    maxSplits: 4,
  },
  // The top band: a sixth bar, the widest day, and either one supposition or two that decide each other.
  wizard: {
    ticks: 16,
    bars: 6,
    minLen: 2,
    maxLen: 4,
    maxGap: 4,
    kinds: ["pin", "link", "before", "apart", "together", "span"],
    minRung: "split",
    maxRung: "split",
    minSplits: 5,
    maxSplits: 20,
  },
}
