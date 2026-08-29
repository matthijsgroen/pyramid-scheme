import type { ProcessionPuzzle, ProcessionState } from "@/mods/puzzle/game/procession/procession"
import { deduce, requiredRung, type Rung } from "@/mods/puzzle/game/procession/solveProcession"

export type ProcessionHint = {
  /** Which sentence says why, keyed by the rung that reaches it (`puzzle-screens.md` §4.3). */
  rung: Rung
  /** The row it is about, and the tick the bar belongs on — the ticks the board hatches. */
  bar: number
  tick: number
}

/**
 * The first bar the ladder can place that the player has not placed there.
 *
 * **A hint here is shaped differently from a grid family's, because the board is never empty.** Every bar
 * is somewhere from the first frame, so there is no blank cell to fill — what a stuck player has is a bar
 * in the wrong place. So the ladder is run from nothing known, in its own order, and the hint is the
 * earliest thing it settles that the board disagrees with (`procession.md` §7).
 *
 * Derived only when asked: the split rung supposes its way over every candidate on the board, which is
 * cheap on six bars and not free.
 */
export const buildProcessionHint = (puzzle: ProcessionPuzzle, state: ProcessionState): ProcessionHint | undefined => {
  const ladder = requiredRung(puzzle)
  if (!ladder) return undefined
  const settled = deduce(puzzle, ladder.rung).settled
  const wrong = settled.find(step => state.starts[step.bar] !== step.tick)
  return wrong && { rung: wrong.rung, bar: wrong.bar, tick: wrong.tick }
}
