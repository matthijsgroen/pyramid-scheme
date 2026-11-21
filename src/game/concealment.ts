import type { Direction, FloorGrid, GridCell } from "./siteTypes"
import { oneWayRuns, revealAll } from "./gridNavigation"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// A region barrier's door a mechanism drives: a shut one is a barrier the player can open from elsewhere.
// An edge gate, a ward or a key gate is not a barrier in this sense and conceals nothing.
const mechanismKeysOf = (grid: FloorGrid): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room") for (const { gateKeyId } of cell.mechanism?.positions ?? []) keys.add(gateKeyId)
  return keys
}

const isBarrier = (cell: GridCell, keys: ReadonlySet<string>): boolean =>
  cell.type === "room" &&
  cell.regionBarrier !== undefined &&
  cell.requiredKeyId !== undefined &&
  keys.has(cell.requiredKeyId)

/**
 * Every cell reachable from `from` along the grid's passages, ignoring what has been explored. A drop is
 * crossed launch to landing only, and its span is seen from either foot. A cell `stops` names is stood
 * on, never crossed.
 */
export const reachFrom = (
  grid: FloorGrid,
  from: readonly [number, number],
  stops: (cell: GridCell) => boolean
): Set<string> => {
  const runs = oneWayRuns(grid)
  const seen = new Set<string>()
  const queue: [number, number][] = [[from[0], from[1]]]
  const visit = (r: number, c: number) => {
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty" || seen.has(`${r},${c}`)) return
    seen.add(`${r},${c}`)
    queue.push([r, c])
  }
  seen.add(`${from[0]},${from[1]}`)
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    const cell = grid.cells[r][c]
    if (cell.type === "empty" || stops(cell)) continue
    for (const dir of cell.dirs) visit(r + MOVES[dir][0], c + MOVES[dir][1])
    for (const run of runs) if (run.launch[0] === r && run.launch[1] === c) visit(run.landing[0], run.landing[1])
  }
  for (const run of runs)
    if ([run.launch, run.landing].some(([r, c]) => seen.has(`${r},${c}`)))
      for (const [r, c] of run.cells) seen.add(`${r},${c}`)
  return seen
}

/**
 * The ground the player cannot get to only because a barrier is shut: reachable from `from` with every
 * barrier open, not reachable now. Ground lost to a one-way already taken is unreachable either way, so
 * it is not named. The barrier's own cell is reachable now, so it stays in view.
 */
export const concealedBehindBarriers = (grid: FloorGrid, from: readonly [number, number]): ReadonlySet<string> => {
  const keys = mechanismKeysOf(grid)
  const now = reachFrom(grid, from, cell => isBarrier(cell, keys))
  const hidden = new Set<string>()
  for (const key of reachFrom(grid, from, () => false)) if (!now.has(key)) hidden.add(key)
  return hidden
}

/** How many steps past a shut barrier's blockage the player sees into its flooded region. */
export const PEEK_CELLS = 2

/**
 * The `hidden` ground seen through a shut barrier: from each of its blockage cells `shows` names, every cell
 * of that barrier's region within `PEEK_CELLS` steps along open ways, never onto a barrier's cell.
 */
const peekedPastBarriers = (
  grid: FloorGrid,
  hidden: ReadonlySet<string>,
  shows: (cell: GridCell, key: string) => boolean
): Set<string> => {
  const keys = mechanismKeysOf(grid)
  const peeked = new Set<string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.regionBarrier || !isBarrier(cell, keys) || !shows(cell, `${r},${c}`)) return
      const { region } = cell.regionBarrier
      const steps = new Map<string, number>([[`${r},${c}`, 0]])
      const queue: [number, number][] = [[r, c]]
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!
        const here = grid.cells[qr][qc]
        const step = steps.get(`${qr},${qc}`)!
        if (here.type === "empty" || step === PEEK_CELLS) continue
        for (const dir of here.dirs) {
          const [nr, nc] = [qr + MOVES[dir][0], qc + MOVES[dir][1]]
          const next = grid.cells[nr]?.[nc]
          const key = `${nr},${nc}`
          if (!next || next.type === "empty" || steps.has(key)) continue
          if (next.region !== region || (next.type === "room" && next.regionBarrier)) continue
          steps.set(key, step + 1)
          queue.push([nr, nc])
          if (hidden.has(key)) peeked.add(key)
        }
      }
    })
  )
  return peeked
}

/** `grid` with every `peeked` cell drawn as seen and every other `hidden` cell drawn as fog. */
const drawConcealed = (grid: FloorGrid, hidden: ReadonlySet<string>, peeked: ReadonlySet<string>): FloorGrid => ({
  ...grid,
  cells: grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (cell.type === "empty") return cell
      const key = `${r},${c}`
      if (peeked.has(key)) return cell.state === "fogged" ? { ...cell, state: "visible" } : cell
      return hidden.has(key) ? { ...cell, state: "fogged" } : cell
    })
  ),
})

/** The grid as drawn: concealed ground reads as fog, except ground of a region a shut barrier floods that was
 * already seen or lies within `PEEK_CELLS` of a blockage in view, which shows under its water
 * (`regionBarrierCovers`). Derived on every draw and stored nowhere. */
export const concealShutGround = (grid: FloorGrid, from: readonly [number, number]): FloorGrid => {
  const flooded = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row) if (cell.type === "room" && cell.regionBarrier) flooded.add(cell.regionBarrier.region)
  const concealed = concealedBehindBarriers(grid, from)
  const hidden = new Set(
    [...concealed].filter(key => {
      const [r, c] = key.split(",").map(Number)
      const cell = grid.cells[r][c]
      const underWater = cell.type === "room" && cell.regionBarrier !== undefined
      return cell.type === "empty" || cell.state === "fogged" || !(underWater || flooded.has(cell.region ?? ""))
    })
  )
  const peeked = peekedPastBarriers(grid, concealed, cell => cell.type !== "empty" && cell.state !== "fogged")
  if (hidden.size === 0 && peeked.size === 0) return grid
  return drawConcealed(grid, hidden, peeked)
}

/** Every cell seen, except the ground a shut barrier cuts off from `from`: nothing there was ever walked or
 * lit, so it stays fogged, bar the barrier's own cell and its region within `PEEK_CELLS` of it. An open
 * barrier cuts off nothing. */
export const revealOpenGround = (grid: FloorGrid, from: readonly [number, number]): FloorGrid => {
  const hidden = concealedBehindBarriers(grid, from)
  const peeked = peekedPastBarriers(grid, hidden, (_, key) => !hidden.has(key))
  return drawConcealed(revealAll(grid), hidden, peeked)
}
