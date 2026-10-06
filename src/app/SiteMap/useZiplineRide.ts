import { useCallback, useEffect, useRef, useState } from "react"
import type { PlayTraversal, Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"

/** How long the rider takes per grid cell of the run. The one duration a ride has: the slide's length is
 * the ride's, and the crossing settles when it ends. */
export const RIDE_MS_PER_CELL = 200

export type Ride = { traversal: Traversal; sprite: string; mirrored: boolean; ms: number; end: () => void }

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * A ZIPLINE TAKEN AS A RIDE: `playTraversal` holds the crossing while `ride` is drawn, and `ride.end`
 * (the slide's end, or a fallback timer when the slide never reports one) lands the player. Anything it
 * cannot draw — another kind of span, a facing with no riding art, a player who asked for less motion —
 * is crossed at once.
 */
export const useZiplineRide = ({
  reducedMotion: asked,
  msPerCell = RIDE_MS_PER_CELL,
}: { reducedMotion?: boolean; msPerCell?: number } = {}) => {
  const [systemReduced] = useState(prefersReducedMotion)
  const reducedMotion = asked ?? systemReduced
  const [ride, setRide] = useState<Ride | null>(null)
  const ending = useRef<(() => void) | null>(null)
  // A ride taken off the map still lands the player. At mount nothing rides, so StrictMode's simulated unmount is a no-op.
  useEffect(() => () => ending.current?.(), [])
  const playTraversal: PlayTraversal = useCallback(
    traversal => {
      const sprite = sharedTileFrames(`explorer-zip-${traversal.dir === "w" ? "e" : traversal.dir}`)[0]
      if (traversal.kind !== "zipline" || !sprite || reducedMotion) return Promise.resolve()
      const cells = Math.abs(traversal.to[0] - traversal.from[0]) + Math.abs(traversal.to[1] - traversal.from[1])
      const ms = cells * msPerCell
      return new Promise<void>(resolve => {
        const end = () => {
          if (ending.current !== end) return
          ending.current = null
          clearTimeout(fallback)
          setRide(null)
          resolve()
        }
        // A slide that never reports its end (a hidden tab, no distance to move) still lands the player.
        const fallback = setTimeout(end, ms + 250)
        ending.current = end
        setRide({ traversal, sprite, mirrored: traversal.dir === "w", ms, end })
      })
    },
    [reducedMotion, msPerCell]
  )
  return { ride, playTraversal }
}
