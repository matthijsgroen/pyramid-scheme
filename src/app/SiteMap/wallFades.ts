import { OCCLUDER_FADE } from "./htmlLayers"
import type { FrontRun, Rect } from "./tileRegions"

type Cell = readonly [number, number]

/** Every cell a walk between two cells crosses: the run between them when they share a row or a column,
 * otherwise just the two ends. A walk the player is on is drawn from one to the other, so a wall has to
 * stay out of the way for the whole crossing and not only where it starts or ends. */
export const walkCells = (from: Cell | undefined, to: Cell | undefined): string[] => {
  const ends = [from, to].filter((c): c is Cell => !!c)
  if (ends.length < 2) return ends.map(([r, c]) => `${r},${c}`)
  const [[r0, c0], [r1, c1]] = ends
  if (r0 !== r1 && c0 !== c1) return [`${r0},${c0}`, `${r1},${c1}`]
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0))
  return Array.from({ length: steps + 1 }, (_, i) => `${r0 + Math.sign(r1 - r0) * i},${c0 + Math.sign(c1 - c0) * i}`)
}

/** The runs somebody is behind: a run fades while any cell the explorer stands on or walks through is
 * one it rises over. */
export const fadedRuns = (runs: readonly FrontRun[], cells: readonly string[]): ReadonlySet<string> =>
  new Set(runs.filter(run => cells.some(cell => run.behind.has(cell))).map(run => run.key))

/** Whether a sprite's box crosses a faded run: it is standing on that wall, and fades with it. */
export const onFadedRun = (runs: readonly FrontRun[], faded: ReadonlySet<string>, [x, y, w, h]: Rect): boolean =>
  runs.some(
    ({ key, bounds: [bx, by, bw, bh] }) => faded.has(key) && x < bx + bw && x + w > bx && y < by + bh && y + h > by
  )

/** The opacity of anything that fades with a wall, and the transition it fades on. */
export const wallFade = (faded: boolean): { opacity: number; className: string } => ({
  opacity: faded ? OCCLUDER_FADE : 1,
  className: "transition-opacity duration-300 ease-out motion-reduce:transition-none",
})
