import { useCallback } from "react"
import type { PlayTraversal } from "./obstacleTraversal"
import { useSqueeze } from "./useSqueeze"
import { useZiplineRide } from "./useZiplineRide"

/** EVERY CROSSING THE MAP DRAWS, behind the one seam navigation plays through: a crossing through a wall's cell
 * (`via`) is a squeeze, any other span a ride. */
export const useCrossing = (options: { reducedMotion?: boolean } = {}) => {
  const { ride, playTraversal: playRide } = useZiplineRide(options)
  const { squeeze, playTraversal: playSqueeze } = useSqueeze(options)
  const playTraversal: PlayTraversal = useCallback(
    traversal => (traversal.via ? playSqueeze(traversal) : playRide(traversal)),
    [playRide, playSqueeze]
  )
  return { ride, squeeze, playTraversal }
}
