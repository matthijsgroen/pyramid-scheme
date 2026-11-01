import type { Direction } from "@/game/siteTypes"
import { CHAR_H, CHAR_W, FOOT_LIFT } from "./ExplorerDot"
import { CELL, MARKER_RADIUS } from "./mapScale"

/** The arrow glyph's reach from its centre, stroke included. */
export const ARROW_RADIUS = MARKER_RADIUS * 1.2 + 1

/** Space kept between an arrow and the figure beside it. */
const FIGURE_GAP = 10

/** The prompt button's height (`MapActionPrompt`: one text-xs line, `py-1`, a border). */
export const PROMPT_HEIGHT = 26
/** Where the prompt hangs above the cell it is offered on. */
export const PROMPT_LIFT = CELL * 0.7

// The figure stands on its spot: bottom-anchored, FOOT_LIFT above the cell's floor line (`ExplorerFigure`).
const FIGURE_TOP = CELL / 2 - CHAR_H - FOOT_LIFT
const FIGURE_BOTTOM = CELL / 2 - FOOT_LIFT

/** How far from his standing spot an arrow is drawn, in the way it points: half a cell at least, with room between the glyph and his figure. */
export const ringDistance = (dir: Direction): number => {
  const clear = (reach: number) => reach + ARROW_RADIUS + FIGURE_GAP
  const needed = dir === "n" ? clear(-FIGURE_TOP) : dir === "s" ? clear(FIGURE_BOTTOM) : clear(CHAR_W / 2)
  return Math.max(CELL / 2, needed)
}

const STEP: Record<Direction, readonly [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }

/**
 * Where the arrow for a way out of `stand` is drawn. With the action prompt showing (`promptAt`, the cell it is offered
 * on) the north arrow sits above it instead, so the two do not overlap.
 */
export const ringPoint = (
  stand: { x: number; y: number },
  dir: Direction,
  promptAt?: { x: number; y: number }
): { x: number; y: number } => {
  const d = ringDistance(dir)
  const [sx, sy] = STEP[dir]
  const y = stand.y + sy * d
  if (dir !== "n" || !promptAt) return { x: stand.x + sx * d, y }
  const promptTop = promptAt.y - PROMPT_LIFT - PROMPT_HEIGHT
  return { x: stand.x, y: Math.min(y, promptTop - FIGURE_GAP - ARROW_RADIUS) }
}
