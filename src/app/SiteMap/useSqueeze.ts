import { useCallback, useEffect, useRef, useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { PlayTraversal, Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"

/** How long each half of a squeeze takes: into the crack, and out of it on the far side. */
export const SQUEEZE_MS_PER_LEG = 350

export type Squeeze = { traversal: Traversal & { via: readonly [number, number] }; msPerLeg: number; end: () => void }

/** The squeezing pose for a heading: east's mirrored for west, south's for north. Undefined while that pose is not
 * painted. */
export const squeezeSprite = (dir: Direction): { url: string; mirrored: boolean } | undefined => {
  const url = sharedTileFrames(`explorer-squeeze-${dir === "w" ? "e" : dir === "n" ? "s" : dir}`)[0]
  return url ? { url, mirrored: dir === "w" } : undefined
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * A CROSSING THROUGH A WALL'S CELL, PLAYED AS A SQUEEZE: `playTraversal` holds the crossing while `squeeze` is drawn,
 * and `squeeze.end` (the second leg's end, or a fallback timer when the slide never reports one) lands the player.
 * A span with no wall to pass, a heading with no squeezing art, or a player who asked for less motion, is crossed at
 * once.
 */
export const useSqueeze = ({
  reducedMotion: asked,
  msPerLeg = SQUEEZE_MS_PER_LEG,
}: { reducedMotion?: boolean; msPerLeg?: number } = {}) => {
  const [systemReduced] = useState(prefersReducedMotion)
  const reducedMotion = asked ?? systemReduced
  const [squeeze, setSqueeze] = useState<Squeeze | null>(null)
  const ending = useRef<(() => void) | null>(null)
  // A squeeze taken off the map still lands the player. At mount nothing plays, so StrictMode's unmount is a no-op.
  useEffect(() => () => ending.current?.(), [])
  const playTraversal: PlayTraversal = useCallback(
    traversal => {
      const via = traversal.via
      if (!via || !squeezeSprite(traversal.dir) || reducedMotion) return Promise.resolve()
      return new Promise<void>(resolve => {
        const end = () => {
          if (ending.current !== end) return
          ending.current = null
          clearTimeout(fallback)
          setSqueeze(null)
          resolve()
        }
        // A slide that never reports its end (a hidden tab) still lands the player.
        const fallback = setTimeout(end, msPerLeg * 2 + 250)
        ending.current = end
        setSqueeze({ traversal: { ...traversal, via }, msPerLeg, end })
      })
    },
    [reducedMotion, msPerLeg]
  )
  return { squeeze, playTraversal }
}
