import { useCallback } from "react"
import { headingOf, type Place } from "@/game/passages"
import type { Direction } from "@/game/siteTypes"
import { CELL } from "./mapScale"
import type { Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"
import { useHeldCrossing } from "./useHeldCrossing"

/** How long each half of a squeeze takes: into the crack, and out of it on the far side. A head-on squeeze is one
 * slide as long as both. */
export const SQUEEZE_MS_PER_LEG = 350

/** How long each half of a sideways squeeze takes: slower, as he slides along the wall's length behind it. */
export const SQUEEZE_SIDEWAYS_MS_PER_LEG = 1000

/** How long a whole squeeze takes, head-on or round a corner. */
export const SQUEEZE_MS = SQUEEZE_MS_PER_LEG * 2

/** How far a sideways squeeze is drawn above the foot line, in map units. */
export const SQUEEZE_SIDEWAYS_LIFT = 10

/** How long a whole sideways squeeze takes. */
export const SQUEEZE_SIDEWAYS_MS = SQUEEZE_SIDEWAYS_MS_PER_LEG * 2

/** How far a head-on squeeze slides inside the wall's cell: from in front of its face to behind it. */
export const SQUEEZE_HEAD_ON_SLIDE = CELL / 4

/**
 * How a crack is crossed, read off its two legs. HEAD-ON, through a wall across a north-south way: the explorer is
 * drawn over the wall and passes behind it by fading, the wall solid until he stands behind it. SIDEWAYS, through a
 * wall along an east-west way: he slides from one side to the other behind the wall, which is drawn over him. A crack
 * at a CORNER slides in and out, each leg in its own heading, drawn over the wall.
 */
export type SqueezeWay = "headOn" | "sideways" | "corner"

export type Squeeze = {
  traversal: Traversal & { via: Place }
  way: SqueezeWay
  msPerLeg: number
  /** The whole squeeze: both legs, or the one head-on slide. */
  ms: number
  end: () => void
}

const isNorthSouth = (dir: Direction) => dir === "n" || dir === "s"

export const squeezeWay = ({ from, via, to }: { from: Place; via: Place; to: Place }): SqueezeWay => {
  const into = isNorthSouth(headingOf(from, via))
  const out = isNorthSouth(headingOf(via, to))
  return into && out ? "headOn" : !into && !out ? "sideways" : "corner"
}

/** The squeezing pose for a heading: east's mirrored for west, south's for north. Undefined while that pose is not
 * painted. */
export const squeezeSprite = (dir: Direction): { url: string; mirrored: boolean } | undefined => {
  const url = sharedTileFrames(`explorer-squeeze-${dir === "w" ? "e" : dir === "n" ? "s" : dir}`)[0]
  return url ? { url, mirrored: dir === "w" } : undefined
}

/**
 * A CROSSING THROUGH A WALL'S CELL, PLAYED AS A SQUEEZE: `playTraversal` holds the crossing while `squeeze` is drawn,
 * and `squeeze.end` (the slide's end, or a fallback timer when the slide never reports one) lands the player.
 * A span with no wall to pass, a leg whose heading has no squeezing art, or a player who asked for less motion, is
 * crossed at once: a leg drawn with no pose would leave him invisible.
 */
export const useSqueeze = ({
  reducedMotion,
  msPerLeg: msPerLegOverride,
}: { reducedMotion?: boolean; msPerLeg?: number } = {}) => {
  const build = useCallback(
    (traversal: Traversal) => {
      const { from, via, to } = traversal
      if (!via || !squeezeSprite(headingOf(from, via)) || !squeezeSprite(headingOf(via, to))) return undefined
      const way = squeezeWay({ from, via, to })
      const msPerLeg = msPerLegOverride ?? (way === "sideways" ? SQUEEZE_SIDEWAYS_MS_PER_LEG : SQUEEZE_MS_PER_LEG)
      const ms = msPerLeg * 2
      return {
        ms,
        held: (end: () => void): Squeeze => ({ traversal: { ...traversal, via }, way, msPerLeg, ms, end }),
      }
    },
    [msPerLegOverride]
  )
  const { held: squeeze, playTraversal } = useHeldCrossing(build, reducedMotion)
  return { squeeze, playTraversal }
}
