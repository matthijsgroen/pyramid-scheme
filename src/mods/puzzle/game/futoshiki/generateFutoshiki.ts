import { mulberry32, shuffle } from "@/game/random"
import { demandOf, techniquesFor, type DemandId } from "./demands"
import {
  constraintNeighbour,
  solveFutoshikiByTechniques,
  type FutoshikiCellRef,
  type FutoshikiConstraint,
  type FutoshikiPuzzleData,
} from "./techniques"

export type FutoshikiPuzzle = FutoshikiPuzzleData & {
  solution: number[][]
  /** Carried so hints stay inside the same ladder the board was accepted under. */
  techniqueCap: DemandId
}

export type FutoshikiOptions = {
  /** The strongest deduction a board may demand (design doc §5). */
  techniqueCap?: DemandId
  /**
   * The fewest squares that ship pre-filled (design doc §5.1). A floor, not a quota: a board whose
   * own deduction needed more keeps them, and one that needed fewer is topped up from the answer
   * after the signs are thinned — so the extra numbers are a gift to the player rather than
   * something the signs were thinned against.
   */
  prefill?: number
  /**
   * Rungs the board must actually TURN ON to be solvable (design doc §5.3). Because the solver only
   * ever reaches for the cheapest technique that fires, a solve whose hardest step is one of these
   * is a board that stalls without it — so this is a guarantee the player needs the reasoning, not
   * a hope that it turns up. Any one of them satisfies the gate.
   */
  requires?: DemandId[]
}

// Generation is build-then-thin, per docs/game-design/puzzles/futoshiki.md §3: draw a Latin square,
// write down every sign it implies, then take signs and pre-filled numbers away for as long as the
// technique solver still reaches the end unaided. Every intermediate board is settled by deduction, so
// the one that ships is too — and that also settles uniqueness, since each step along the way was
// forced. No separate solution counter has to run.
//
// A tier that insists on a rung (§5.3) throws most attempts away, so the ceiling is far above the
// handful a plain draw needs — wizard spends about seven.
const MAX_ATTEMPTS = 400

// Pruning reaches a fixpoint in two sweeps on every tier measured; the third is the guard, not the plan.
const MAX_PRUNE_SWEEPS = 6

const solutionSquare = (size: number, random: () => number): number[][] => {
  const grid = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const fill = (index: number): boolean => {
    if (index === size * size) return true
    const row = Math.floor(index / size)
    const col = index % size
    for (const value of shuffle(
      Array.from({ length: size }, (_, i) => i + 1),
      random
    )) {
      if (grid[row].includes(value)) continue
      if (grid.some(cells => cells[col] === value)) continue
      grid[row][col] = value
      if (fill(index + 1)) return true
      grid[row][col] = 0
    }
    return false
  }
  fill(0)
  return grid
}

const everySign = (solution: number[][]): FutoshikiConstraint[] => {
  const size = solution.length
  const signs: FutoshikiConstraint[] = []
  const add = (row: number, col: number, direction: "right" | "down") => {
    const neighbour = constraintNeighbour({ row, col, direction, relation: "<" })
    signs.push({
      row,
      col,
      direction,
      relation: solution[row][col] < solution[neighbour.row][neighbour.col] ? "<" : ">",
    })
  }
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      if (col + 1 < size) add(row, col, "right")
      if (row + 1 < size) add(row, col, "down")
    }
  return signs
}

const blankGivens = (size: number): (number | undefined)[][] =>
  Array.from({ length: size }, () => new Array<number | undefined>(size).fill(undefined))

const cellsWhere = (
  givens: (number | undefined)[][],
  wanted: (value: number | undefined) => boolean
): FutoshikiCellRef[] =>
  givens.flatMap((cells, row) => cells.flatMap((value, col) => (wanted(value) ? [{ row, col }] : [])))

const filledCount = (givens: (number | undefined)[][]): number =>
  givens.flat().filter(value => value !== undefined).length

export const generateFutoshiki = (size: number, seed: number, options: FutoshikiOptions = {}): FutoshikiPuzzle => {
  const { techniqueCap: demand = "nakedSubset", prefill, requires } = options
  const allowed = techniquesFor(demand)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = mulberry32(seed * 7919 + attempt)
    const solution = solutionSquare(size, random)
    const signs = everySign(solution)
    const givens = blankGivens(size)

    // Even with every sign shown, a gentle ladder can stall; each pre-filled number is the smallest
    // concession that unsticks it. Past `size` of them the board is more answer than puzzle, so the
    // attempt is abandoned for a fresh square rather than propped up.
    let settled = solveFutoshikiByTechniques({ size, givens, constraints: signs }, allowed)
    while (!settled.settled && cellsWhere(givens, value => value !== undefined).length < size) {
      const open = cellsWhere(givens, value => value === undefined).filter(
        cell => settled.values[cell.row][cell.col] === undefined
      )
      if (!open.length) break
      const pick = open[Math.floor(random() * open.length)]
      givens[pick.row][pick.col] = solution[pick.row][pick.col]
      settled = solveFutoshikiByTechniques({ size, givens, constraints: signs }, allowed)
    }
    if (!settled.settled) continue

    // Pre-filled numbers go first, and that ordering is the whole point: signs and givens can each
    // stand in for the other, so whichever is thinned first survives. The signs ARE this family — a
    // 4x4 carrying one sign and three given numbers is a Latin square with a decoration, and teaches
    // nothing about what a sign means.
    let kept = givens
    for (const cell of shuffle(
      cellsWhere(givens, value => value !== undefined),
      random
    )) {
      const trial = kept.map(cells => [...cells])
      trial[cell.row][cell.col] = undefined
      if (solveFutoshikiByTechniques({ size, givens: trial, constraints: signs }, allowed).settled) kept = trial
    }

    // Then every sign the board turns out not to need, to a fixpoint: taking one away can make
    // another removable, so a single pass leaves redundant signs standing. A sign the player cannot
    // spend is worse than no sign — it hides which ones the deduction actually turns on.
    let constraints = signs
    for (let sweep = 0; sweep < MAX_PRUNE_SWEEPS; sweep++) {
      const before = constraints.length
      for (const sign of shuffle(constraints, random)) {
        const trial = constraints.filter(other => other !== sign)
        if (trial.length === constraints.length) continue
        if (solveFutoshikiByTechniques({ size, givens: kept, constraints: trial }, allowed).settled) constraints = trial
      }
      if (constraints.length === before) break
    }

    // Then the gift: numbers handed back to the player on top of a board already thinned without
    // them. Granted after the signs are settled rather than before, so the tier's generosity never
    // costs the board a sign (design doc §5.1).
    if (prefill !== undefined)
      for (const cell of shuffle(
        cellsWhere(kept, value => value === undefined),
        random
      )) {
        if (filledCount(kept) >= prefill) break
        kept[cell.row][cell.col] = solution[cell.row][cell.col]
      }

    // Read back what the FINISHED board turns on — after the thinning that decides it, and after the
    // pre-filled numbers that soften it. Checking before either would guarantee a rung of a board
    // nobody plays: every number handed back can retire the very step the tier asked for.
    const deepest = solveFutoshikiByTechniques({ size, givens: kept, constraints }, allowed).deepest
    if (requires?.length && !(deepest && requires.includes(demandOf(deepest)))) continue

    return { size, givens: kept, constraints, solution, techniqueCap: demand }
  }
  throw new Error(`generateFutoshiki: no board meeting the tier's gates (size=${size}, seed=${seed})`)
}
