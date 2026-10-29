import type { Direction } from "../../siteTypes"
import type { Cell } from "../state"

const swap = ([r, c]: Cell): Cell => [c, r]

/** The cells strictly between `from` and `to` along a row, `from` west of `to`: straight where they share a row,
 * else one jog north or south at column `jog`. */
const eastward = ([fr, fc]: Cell, [tr, tc]: Cell, jog: number): Cell[] => {
  if (fr === tr) return Array.from({ length: tc - fc - 1 }, (_, i): Cell => [fr, fc + 1 + i])
  const cells: Cell[] = []
  for (let c = fc + 1; c <= jog; c++) cells.push([fr, c])
  const step = tr > fr ? 1 : -1
  for (let r = fr + step; r !== tr + step; r += step) cells.push([r, jog])
  for (let c = jog + 1; c < tc; c++) cells.push([tr, c])
  return cells
}

/**
 * THE CORRIDOR ACROSS ONE BAND, as the cells strictly between `from` and `to`, where `from` is the last cell of one
 * footprint and `to` the first of the next, `dir` the way from one to the other (`e` or `s`) and `gap` the band's gap
 * cells on that axis. Ends that line up are joined straight. Ends that do not are joined by one jog inside the gap:
 * with chance `1 - straightness` at a seeded line of it, otherwise at its middle line. Draws come from `rand`: one
 * roll per corridor, and a second for a seeded jog.
 */
export const routeBand = (
  from: Cell,
  to: Cell,
  dir: Extract<Direction, "e" | "s">,
  gap: readonly [number, number],
  straightness: number,
  rand: () => number
): Cell[] => {
  const winds = rand() < 1 - straightness
  const [first, last] = gap
  const aligned = dir === "e" ? from[0] === to[0] : from[1] === to[1]
  const jog = !aligned && winds ? first + Math.floor(rand() * (last - first + 1)) : Math.floor((first + last) / 2)
  return dir === "e" ? eastward(from, to, jog) : eastward(swap(from), swap(to), jog).map(swap)
}
