import type { HoleLook } from "@/game/stonePlay"

/** The painting each look of a pipe's hole wears, in the cell's mechanism style (`MECHANISM_STYLE`, shared
 * `tiles/default/` unless a style paints its own): the stone lying in it painted as an edit of the empty one so the two
 * swap on a wall. */
export const PIPE_HOLE_TILE: Record<HoleLook, string> = { empty: "pipeHole", stone: "pipeHoleStone" }
