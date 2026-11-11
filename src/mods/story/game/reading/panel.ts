/**
 * Where a wall's signs sit on its painted panel.
 *
 * A panel is the wall as painted: a slab with a cartouche on it, and the signs written INSIDE the
 * cartouche. Every measure here is a share of the panel (0–1 of its width or height), so the same numbers
 * hold at whatever size the screen draws it.
 */
export type Rect = { x: number; y: number; width: number; height: number }

/** Which way the signs run: down a standing cartouche, or along a lying one. */
export type Flow = "column" | "row"

export type Panel = {
  /** The backdrop the signs are written on, by name (`src/assets/reading/<art>.webp`); none draws a cartouche. */
  art?: string
  /** Width over height of the panel — the backdrop's own, so the signs land where it painted the cartouche. */
  aspect: number
  /** The inside of the cartouche, where the signs go. */
  signs: Rect
  flow: Flow
  /**
   * The cut sign the painted cartouche itself stands for. It is the frame, so it is not written again
   * inside it.
   */
  frame?: number
}

/** How much of its cell a sign fills, so neighbours never touch and none touches the rope. */
const FILL = 0.8

/** The indices of the cut signs written inside the cartouche, in reading order. */
export const inscribed = (panel: Panel, cut: readonly string[]): number[] =>
  cut.map((_, at) => at).filter(at => at !== panel.frame)

/** The sign rectangle cut into `count` equal cells along the flow. */
export const signCells = (panel: Panel, count: number): Rect[] => {
  const { x, y, width, height } = panel.signs
  return Array.from({ length: count }, (_, i) =>
    panel.flow === "column"
      ? { x, y: y + (height / count) * i, width, height: height / count }
      : { x: x + (width / count) * i, y, width: width / count, height }
  )
}

/**
 * One size for every sign of the panel, as a share of the panel's WIDTH (what CSS `cqw` measures): the
 * largest that fits a cell both ways. A cell's height is a share of the panel's height, so it is turned
 * into width units through the aspect. One size for all, because a name is written in one hand.
 */
export const glyphSize = (panel: Panel, count: number): number => {
  const [cell] = signCells(panel, count)
  if (!cell) return 0
  return Math.min(cell.width, cell.height / panel.aspect) * FILL
}
