import type { Direction } from "../../siteTypes"
import type { Cell } from "../state"

const swap = ([r, c]: Cell): Cell => [c, r]

/** The cells strictly between the first and last corner, walking each leg straight, corners included. */
const walk = (corners: readonly Cell[]): Cell[] => {
  const cells: Cell[] = []
  let [r, c] = corners[0]
  for (const [tr, tc] of corners.slice(1))
    while (r !== tr || c !== tc) {
      r += Math.sign(tr - r)
      c += Math.sign(tc - c)
      cells.push([r, c])
    }
  return cells.slice(0, -1)
}

type Span = readonly [number, number]

/** The corners of a corridor along a row, `from` west of `to`, inside a band whose gap columns are `gap` and whose
 * rows are `across`. */
const eastward = (from: Cell, to: Cell, gap: Span, across: Span, winds: boolean, rand: () => number): Cell[] => {
  const [fr] = from
  const [tr] = to
  const [first, last] = gap
  if (fr !== tr) {
    const jog = winds ? first + Math.floor(rand() * (last - first + 1)) : Math.floor((first + last) / 2)
    return [from, [fr, jog], [tr, jog], to]
  }
  const offsets = Array.from({ length: across[1] - across[0] + 1 }, (_, i) => across[0] + i).filter(r => r !== fr)
  if (!winds || last <= first || offsets.length === 0) return [from, to]
  const out = first + Math.floor(rand() * (last - first))
  const back = out + 1 + Math.floor(rand() * (last - out))
  const row = offsets[Math.floor(rand() * offsets.length)]
  return [from, [fr, out], [row, out], [row, back], [fr, back], to]
}

/**
 * THE CORRIDOR ACROSS ONE BAND, as the cells strictly between `from` and `to`, where `from` is the last cell of one
 * footprint and `to` the first of the next, `dir` the way from one to the other (`e` or `s`), `gap` the band's gap
 * cells on that axis and `across` its block's cells on the other. With chance `1 - straightness` it winds: ends that
 * do not line up jog once at a seeded line of the gap, and ends that do step out to a seeded line across the band
 * and back, where the gap is two lines deep and the block more than one wide; otherwise they run straight, and ends
 * that do not line up jog at the gap's middle line. Draws come from `rand`: one roll per corridor, then the seeded
 * lines of a winding one.
 */
export const routeBand = (
  from: Cell,
  to: Cell,
  dir: Extract<Direction, "e" | "s">,
  gap: Span,
  across: Span,
  straightness: number,
  rand: () => number
): Cell[] => {
  const winds = rand() < 1 - straightness
  return dir === "e"
    ? walk(eastward(from, to, gap, across, winds, rand))
    : walk(eastward(swap(from), swap(to), gap, across, winds, rand).map(swap))
}
