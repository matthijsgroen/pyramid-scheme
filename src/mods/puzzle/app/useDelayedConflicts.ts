import { useEffect, useState } from "react"

/**
 * How long a square is left alone before the board says anything about it.
 *
 * A tap cycles through a mark on the way to the one the player wants, so that first mark is a square they
 * are *passing through*. Calling it a mistake while their finger is still moving is feedback about a state
 * they never chose. Long enough to cover a second tap, short enough that a square they meant turns red while
 * they are still looking at it.
 */
const QUIET_MS = 600

/**
 * The conflicts worth drawing: the ones on squares the player has stopped touching.
 *
 * Held as a delayed snapshot rather than a per-square timer, because the rules these families break are about
 * whole groups rather than squares — one tap can put a row over its count, and that row's reds should wait for
 * the same beat as the square that caused them. Conflicts on squares that have not changed since the snapshot
 * keep showing, so a red the player has already earned does not blink off every time they tap somewhere else.
 *
 * Shared by every family whose tap cycles through more than one answer: eclipse's sun-and-moon and star
 * battle's star-and-dark have the same problem and the same fix.
 */
export const useDelayedConflicts = <T>(
  marks: readonly T[],
  conflictsOf: (marks: readonly T[]) => ReadonlySet<number>,
  quietMs = QUIET_MS
): ReadonlySet<number> => {
  const [settled, setSettled] = useState(marks)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(marks), quietMs)
    return () => clearTimeout(timer)
  }, [marks, quietMs])

  // Not memoised: this reads a board of at most a few dozen squares, and a dependency on the caller's own
  // conflict function would be a new array identity every render anyway.
  return new Set([...conflictsOf(settled)].filter(cell => settled[cell] === marks[cell]))
}
