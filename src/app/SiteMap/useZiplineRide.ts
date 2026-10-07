import { useCallback } from "react"
import type { Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"
import { useHeldCrossing } from "./useHeldCrossing"

/** How long the rider takes per grid cell of the run. The one duration a ride has: the slide's length is
 * the ride's, and the crossing settles when it ends. */
export const RIDE_MS_PER_CELL = 200

export type Ride = { traversal: Traversal; sprite: string; mirrored: boolean; ms: number; end: () => void }

/**
 * A ZIPLINE TAKEN AS A RIDE: `playTraversal` holds the crossing while `ride` is drawn, and `ride.end`
 * (the slide's end, or a fallback timer when the slide never reports one) lands the player. Anything it
 * cannot draw — another kind of span, a facing with no riding art, a player who asked for less motion —
 * is crossed at once.
 */
export const useZiplineRide = ({
  reducedMotion,
  msPerCell = RIDE_MS_PER_CELL,
}: { reducedMotion?: boolean; msPerCell?: number } = {}) => {
  const build = useCallback(
    (traversal: Traversal) => {
      const sprite = sharedTileFrames(`explorer-zip-${traversal.dir === "w" ? "e" : traversal.dir}`)[0]
      if (traversal.kind !== "zipline" || !sprite) return undefined
      const cells = Math.abs(traversal.to[0] - traversal.from[0]) + Math.abs(traversal.to[1] - traversal.from[1])
      const ms = cells * msPerCell
      return { ms, held: (end: () => void): Ride => ({ traversal, sprite, mirrored: traversal.dir === "w", ms, end }) }
    },
    [msPerCell]
  )
  const { held: ride, playTraversal } = useHeldCrossing(build, reducedMotion)
  return { ride, playTraversal }
}
