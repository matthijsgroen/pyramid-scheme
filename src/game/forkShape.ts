import type { Direction } from "./siteTypes"

/**
 * A fork's compass layout reduced to what is left of it up to rotation: two ways out at right angles,
 * two facing each other, or three — and there is only one three-shape, since the fourth direction is
 * the one left out. A structural fact about the fork, so whatever stands in it can be built for the
 * layout without being built for the compass.
 */
export const FORK_SHAPES = ["adjacent", "opposite", "three"] as const

export type ForkShape = (typeof FORK_SHAPES)[number]

const FACING: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/**
 * The shape of a fork, from the compass directions of the ways out that matter to whatever stands in
 * it. Order and repeats say nothing: only which distinct directions are present.
 *
 * Undefined where this vocabulary has no name for the layout. Zero or one direction is no fork to
 * dress — the assembler refuses a switch that closed fewer than two ways out — and no name is minted
 * for four, which is a layout the shipped world never produces.
 */
export const classifyForkShape = (dirs: readonly Direction[]): ForkShape | undefined => {
  const distinct = [...new Set(dirs)]
  if (distinct.length === 3) return "three"
  if (distinct.length !== 2) return undefined
  return FACING[distinct[0]] === distinct[1] ? "opposite" : "adjacent"
}
