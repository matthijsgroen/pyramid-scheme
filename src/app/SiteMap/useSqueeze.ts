import { useCallback } from "react"
import { headingOf } from "@/game/passages"
import type { Direction } from "@/game/siteTypes"
import type { Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"
import { useHeldCrossing } from "./useHeldCrossing"

/** How long each half of a squeeze takes: into the crack, and out of it on the far side. */
export const SQUEEZE_MS_PER_LEG = 350

export type Squeeze = { traversal: Traversal & { via: readonly [number, number] }; msPerLeg: number; end: () => void }

/** The squeezing pose for a heading: east's mirrored for west, south's for north. Undefined while that pose is not
 * painted. */
export const squeezeSprite = (dir: Direction): { url: string; mirrored: boolean } | undefined => {
  const url = sharedTileFrames(`explorer-squeeze-${dir === "w" ? "e" : dir === "n" ? "s" : dir}`)[0]
  return url ? { url, mirrored: dir === "w" } : undefined
}

/**
 * A CROSSING THROUGH A WALL'S CELL, PLAYED AS A SQUEEZE: `playTraversal` holds the crossing while `squeeze` is drawn,
 * and `squeeze.end` (the second leg's end, or a fallback timer when the slide never reports one) lands the player.
 * A span with no wall to pass, a leg whose heading has no squeezing art, or a player who asked for less motion, is
 * crossed at once: a leg drawn with no pose would leave him invisible.
 */
export const useSqueeze = ({
  reducedMotion,
  msPerLeg = SQUEEZE_MS_PER_LEG,
}: { reducedMotion?: boolean; msPerLeg?: number } = {}) => {
  const build = useCallback(
    (traversal: Traversal) => {
      const { from, via, to } = traversal
      if (!via || !squeezeSprite(headingOf(from, via)) || !squeezeSprite(headingOf(via, to))) return undefined
      return {
        ms: msPerLeg * 2,
        held: (end: () => void): Squeeze => ({ traversal: { ...traversal, via }, msPerLeg, end }),
      }
    },
    [msPerLeg]
  )
  const { held: squeeze, playTraversal } = useHeldCrossing(build, reducedMotion)
  return { squeeze, playTraversal }
}
