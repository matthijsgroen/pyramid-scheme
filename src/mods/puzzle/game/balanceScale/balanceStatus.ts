import type { BalanceAssignment, Glyph, PanItem, Scale } from "./techniques"

export type ScaleStatus = "level" | "left" | "right" | "unknown"

export type BalanceLine = {
  /** Each pan's weight, or undefined while a glyph on it has none — an unweighed pan is not zero. */
  left?: number
  right?: number
  status: ScaleStatus
}

const panTotal = (items: PanItem[], values: BalanceAssignment): number | undefined =>
  items.reduce<number | undefined>((sum, item) => {
    if (sum === undefined) return undefined
    const weight = item.kind === "weight" ? item.value : values[item.glyph]
    return weight === undefined ? undefined : sum + weight
  }, 0)

// A scale still holding a glyph without a weight reads as UNKNOWN, never as level: a board of
// level-looking scales that is not solved would be a lie (design doc §7).
const lineOf = (scale: Scale, values: BalanceAssignment): BalanceLine => {
  const left = panTotal(scale.left, values)
  const right = panTotal(scale.right, values)
  if (left === undefined || right === undefined) return { left, right, status: "unknown" }
  return { left, right, status: left === right ? "level" : left > right ? "left" : "right" }
}

export const computeBalanceLines = (scales: Scale[], values: BalanceAssignment): BalanceLine[] =>
  scales.map(scale => lineOf(scale, values))

export const isBalanceSolved = (glyphs: Glyph[], lines: BalanceLine[], values: BalanceAssignment): boolean =>
  glyphs.every(glyph => values[glyph] !== undefined) && lines.every(line => line.status === "level")
