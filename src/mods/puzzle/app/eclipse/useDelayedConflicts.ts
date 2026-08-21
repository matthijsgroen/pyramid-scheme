import { useEffect, useMemo, useState } from "react"
import { eclipseConflicts, type EclipseMarks, type EclipsePuzzle } from "@/mods/puzzle/game/eclipse/eclipse"

/**
 * How long a square is left alone before the board says anything about it.
 *
 * One tap is a sun and two is a moon, so the sun is a square the player is *passing through*. Calling it a
 * mistake while their finger is still on the way there is feedback about a state they never chose. Long
 * enough to cover a second tap, short enough that a square they meant turns red while they are still
 * looking at it.
 */
const QUIET_MS = 600

/**
 * The conflicts worth drawing: the ones on squares the player has stopped touching.
 *
 * Held as a delayed snapshot rather than a per-square timer, because the rules are about lines rather than
 * squares — a tap can put a whole row over its count, and that row's reds should wait for the same beat as
 * the square that caused them. Conflicts on squares that have not changed since the snapshot keep showing,
 * so a red the player has already earned does not blink off every time they tap somewhere else.
 */
export const useDelayedConflicts = (puzzle: EclipsePuzzle, state: EclipseMarks, quietMs = QUIET_MS) => {
  const [settled, setSettled] = useState(state.marks)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(state.marks), quietMs)
    return () => clearTimeout(timer)
  }, [state.marks, quietMs])

  return useMemo(() => {
    const conflicts = eclipseConflicts(puzzle, { marks: settled })
    return new Set([...conflicts].filter(cell => settled[cell] === state.marks[cell]))
  }, [puzzle, settled, state.marks])
}
