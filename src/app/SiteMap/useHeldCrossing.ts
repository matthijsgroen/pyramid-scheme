import { useCallback, useEffect, useRef, useState } from "react"
import type { PlayTraversal, Traversal } from "./obstacleTraversal"
import { prefersReducedMotion } from "./reducedMotion"

/** A crossing that can be drawn: how long it lasts, and what to draw given the call that lands the player. */
export type HeldCrossing<T> = { ms: number; held: (end: () => void) => T }

/**
 * A CROSSING HELD WHILE IT IS DRAWN: `playTraversal` holds the crossing while `held` is set, and the `end` handed to
 * it (the animation's end, or a fallback timer when the animation never reports one) lands the player. Whatever
 * `build` cannot draw, or a player who asked for less motion, is crossed at once. `build` must be stable (useCallback).
 */
export const useHeldCrossing = <T>(
  build: (traversal: Traversal) => HeldCrossing<T> | undefined,
  asked?: boolean
): { held: T | null; playTraversal: PlayTraversal } => {
  const [systemReduced] = useState(prefersReducedMotion)
  const reducedMotion = asked ?? systemReduced
  const [held, setHeld] = useState<T | null>(null)
  const ending = useRef<(() => void) | null>(null)
  // A crossing taken off the map still lands the player. At mount nothing plays, so StrictMode's simulated unmount is
  // a no-op.
  useEffect(() => () => ending.current?.(), [])
  const playTraversal: PlayTraversal = useCallback(
    traversal => {
      const crossing = reducedMotion ? undefined : build(traversal)
      if (!crossing) return Promise.resolve()
      return new Promise<void>(resolve => {
        const end = () => {
          if (ending.current !== end) return
          ending.current = null
          clearTimeout(fallback)
          setHeld(null)
          resolve()
        }
        // An animation that never reports its end (a hidden tab, no distance to move) still lands the player.
        const fallback = setTimeout(end, crossing.ms + 250)
        ending.current = end
        setHeld(crossing.held(end))
      })
    },
    [reducedMotion, build]
  )
  return { held, playTraversal }
}
