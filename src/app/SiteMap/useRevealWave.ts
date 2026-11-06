import { useEffect, useState } from "react"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { prefersReducedMotion } from "./reducedMotion"

/** How long one step of the wave waits after the one before it. */
export const REVEAL_STEP_MS = 140
/** How long a cell takes to come out of the rock once its turn comes. */
export const REVEAL_FADE_MS = 700

export type RevealingCell = { at: readonly [number, number]; delay: number }

const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const shownCells = (grid: FloorGrid): Set<string> => {
  const shown = new Set<string>()
  grid.cells.forEach((row, r) => row.forEach((cell, c) => cell.type !== "empty" && shown.add(`${r},${c}`)))
  return shown
}

/**
 * The hidden cells that just appeared, each with the moment it comes out: a step further from the floor the player
 * already saw is a step later, so an opened corridor runs out from where they stand.
 */
export const revealWave = (before: ReadonlySet<string>, grid: FloorGrid): RevealingCell[] => {
  const fresh = new Set(
    [...shownCells(grid)].filter(key => {
      if (before.has(key)) return false
      const [r, c] = key.split(",").map(Number)
      const cell = grid.cells[r][c]
      return cell.type !== "empty" && cell.hidden === true
    })
  )
  const steps = new Map<string, number>()
  let frontier = [...fresh].filter(key => {
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r][c]
    if (cell.type === "empty") return false
    return [...cell.dirs].some(dir => before.has(`${r + DIR_MOVES[dir][0]},${c + DIR_MOVES[dir][1]}`))
  })
  for (let step = 0; frontier.length > 0; step++) {
    for (const key of frontier) steps.set(key, step)
    frontier = [
      ...new Set(
        frontier.flatMap(key => {
          const [r, c] = key.split(",").map(Number)
          const cell = grid.cells[r][c]
          if (cell.type === "empty") return []
          return [...cell.dirs]
            .map(dir => `${r + DIR_MOVES[dir][0]},${c + DIR_MOVES[dir][1]}`)
            .filter(next => fresh.has(next) && !steps.has(next))
        })
      ),
    ]
  }
  // Ground still in the dark keeps its shape to itself: only what the opening lays bare comes out of the rock.
  return [...fresh].flatMap(key => {
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r][c]
    if (cell.type === "empty" || cell.state === "fogged") return []
    return [{ at: [r, c] as const, delay: (steps.get(key) ?? 0) * REVEAL_STEP_MS }]
  })
}

type Seen = { floor: string; shown: ReadonlySet<string> }

/** The wave to draw over a corridor the player just opened on this floor. Never on a floor change, never under reduced motion. */
export const useRevealWave = (grid: FloorGrid, floor: string): readonly RevealingCell[] => {
  const [seen, setSeen] = useState<Seen>(() => ({ floor, shown: shownCells(grid) }))
  const [wave, setWave] = useState<readonly RevealingCell[]>([])

  const shown = shownCells(grid)
  const changed = seen.floor !== floor || shown.size !== seen.shown.size || [...shown].some(key => !seen.shown.has(key))
  if (changed) {
    setSeen({ floor, shown })
    if (seen.floor === floor && !prefersReducedMotion()) {
      const next = revealWave(seen.shown, grid)
      if (next.length > 0) setWave(next)
    } else if (seen.floor !== floor) setWave([])
  }

  useEffect(() => {
    if (wave.length === 0) return
    const last = Math.max(...wave.map(cell => cell.delay))
    const timer = setTimeout(() => setWave([]), last + REVEAL_FADE_MS)
    return () => clearTimeout(timer)
  }, [wave])

  return wave
}
