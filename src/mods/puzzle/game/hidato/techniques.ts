import { hexDistance, hexKey, hexNeighbours, type Hex } from "./hex"

// The deduction system behind both generation and hints, per docs/game-design/puzzles/hidato.md §4.
//
// Two vocabularies, and they answer different questions. **Pruning** is what the board is allowed to
// know — which cells a number could still sit in — and it is the tier dial, because each level is a
// genuinely different thing to notice. **Techniques** are the reasons a number gets written down, and
// they exist for the hint: every one of them is "only one cell is left", said in the way that shows
// WHY, and the ordering is by how well that reason explains itself rather than by strength.

/**
 * How far the board reasons about where a number could go. A tier caps this (design doc §5).
 *
 * **Two rungs, and the missing third is the finding.** A distance bound — "this cell is 4 steps from the
 * 7, so it cannot hold the 9" — was built as the middle rung and measured to be worth nothing: iterated
 * adjacency already gives exactly it, because a chain of neighbour-supports from a written number to a
 * cell IS a walk, and on a hex lattice a walk of any length at or above the distance exists (its
 * triangles absorb the slack, so there is no parity to dodge). Not one board in the sample needed the
 * distance rung to settle and stalled without it. It is left out rather than kept as flavour: a rung a
 * tier can demand but no board can turn on is a dial that does nothing.
 */
export const PRUNINGS = ["adjacency", "gapPath"] as const

export type PruningId = (typeof PRUNINGS)[number]

export const TECHNIQUES = ["sandwich", "neighbourForced", "onlyCell", "onlyValue"] as const

export type TechniqueId = (typeof TECHNIQUES)[number]

export type HidatoPuzzleData = {
  /** The comb, in a stable order — the board is exactly these cells, holding 1…cells.length. */
  cells: Hex[]
  /** The numbers the board ships with, by cell key. Always includes the first and the last. */
  givens: Record<string, number>
}

export type HidatoStep = {
  technique: TechniqueId
  /** The number this step writes down, and where. */
  value: number
  cell: Hex
  /** The cells the reason argues from — the neighbours already holding a number it leans on. */
  evidence: Hex[]
  params: { value: number; before?: number; after?: number; from?: number }
}

export type HidatoSolveResult = {
  settled: boolean
  steps: HidatoStep[]
  /** What the run reasoned out, by cell key — the givens plus everything it settled. */
  values: Record<string, number>
}

/** How many steps a path enumeration may explore before it gives up and says nothing (design doc §4.4). */
const PATH_BUDGET = 40_000

type Solver = {
  cells: Hex[]
  n: number
  neighbours: number[][]
  distance: number[][]
  /** Cell index -> the number written there. */
  values: (number | undefined)[]
  /** Number - 1 -> the cell index it was written in. */
  at: (number | undefined)[]
  /** Number - 1 -> cell indices it could still sit in. */
  places: Set<number>[]
  /** Cell index -> numbers it could still hold. */
  candidates: Set<number>[]
}

const createSolver = (cells: Hex[], placed: Record<string, number>): Solver => {
  const n = cells.length
  const index = new Map(cells.map((cell, at) => [hexKey(cell), at]))
  const solver: Solver = {
    cells,
    n,
    neighbours: cells.map(cell =>
      hexNeighbours(cell)
        .map(neighbour => index.get(hexKey(neighbour)))
        .filter((at): at is number => at !== undefined)
    ),
    distance: cells.map(from => cells.map(to => hexDistance(from, to))),
    values: new Array<number | undefined>(n).fill(undefined),
    at: new Array<number | undefined>(n).fill(undefined),
    places: Array.from({ length: n }, () => new Set(cells.map((_, at) => at))),
    candidates: cells.map(() => new Set(Array.from({ length: n }, (_, value) => value + 1))),
  }
  for (const [key, value] of Object.entries(placed)) {
    const at = index.get(key)
    // A number outside the board's range, or in a cell the board does not have, is a slip of the
    // caller's rather than a fact to reason from — the hint layer hands over whatever the player typed.
    if (at !== undefined && value >= 1 && value <= n) place(solver, at, value)
  }
  return solver
}

const place = (solver: Solver, cell: number, value: number) => {
  solver.values[cell] = value
  solver.at[value - 1] = cell
  for (const other of solver.places[value - 1]) if (other !== cell) solver.candidates[other].delete(value)
  solver.places[value - 1] = new Set([cell])
  for (const other of solver.candidates[cell]) if (other !== value) solver.places[other - 1].delete(cell)
  solver.candidates[cell] = new Set([value])
}

const eliminate = (solver: Solver, cell: number, value: number): boolean => {
  if (!solver.places[value - 1].has(cell) || solver.values[cell] !== undefined) return false
  solver.places[value - 1].delete(cell)
  solver.candidates[cell].delete(value)
  return true
}

/**
 * A number can only sit where its predecessor and its successor could sit beside it. This is the whole
 * rule of the family, read as an elimination, and it is the one level every tier gets.
 */
const pruneAdjacency = (solver: Solver): boolean => {
  let changed = false
  for (let value = 1; value <= solver.n; value++)
    for (const cell of [...solver.places[value - 1]]) {
      const stranded =
        (value > 1 && !solver.neighbours[cell].some(neighbour => solver.places[value - 2].has(neighbour))) ||
        (value < solver.n && !solver.neighbours[cell].some(neighbour => solver.places[value].has(neighbour)))
      if (stranded) changed = eliminate(solver, cell, value) || changed
    }
  return changed
}

/**
 * Every cell a run BETWEEN two written numbers could thread through, and nothing else.
 *
 * Where adjacency asks "could this cell be reached at all", this one asks "could a whole run get from
 * here to there THROUGH this cell" — so it is the rung that sees a corridor two cells wide is only wide
 * enough for one run.
 *
 * ponytail: enumeration is capped at PATH_BUDGET visits, and a gap that overruns it is left alone
 * rather than half-pruned. Raising the cap buys deeper gaps; a proper fix would count paths per cell
 * with dynamic programming over (cell, offset), which no measured board has needed.
 */
const pruneGapPaths = (solver: Solver): boolean => {
  let changed = false
  const written = solver.at.flatMap((cell, index) => (cell === undefined ? [] : [{ cell, value: index + 1 }]))
  for (let index = 0; index + 1 < written.length; index++) {
    const from = written[index]
    const to = written[index + 1]
    const run = to.value - from.value - 1
    if (run < 1) continue

    const allowed = Array.from({ length: run }, () => new Set<number>())
    const trail: number[] = []
    let budget = PATH_BUDGET
    let overran = false

    const walk = (cell: number, offset: number) => {
      if (overran) return
      if (budget-- <= 0) {
        overran = true
        return
      }
      if (offset === run) {
        if (solver.neighbours[cell].includes(to.cell)) trail.forEach((step, at) => allowed[at].add(step))
        return
      }
      for (const neighbour of solver.neighbours[cell]) {
        if (!solver.places[from.value + offset].has(neighbour)) continue
        if (trail.includes(neighbour)) continue
        // No run of what is left can cover the ground still to go — the cheapest cut there is, and
        // what keeps the enumeration inside its budget on a board with long gaps.
        if (solver.distance[neighbour][to.cell] > run - offset) continue
        trail.push(neighbour)
        walk(neighbour, offset + 1)
        trail.pop()
      }
    }
    walk(from.cell, 0)
    if (overran) continue

    for (let offset = 0; offset < run; offset++)
      for (const cell of [...solver.places[from.value + offset]])
        if (!allowed[offset].has(cell)) changed = eliminate(solver, cell, from.value + offset + 1) || changed
  }
  return changed
}

/** True while the board is still consistent — a number with nowhere to go means the run cannot close. */
const consistent = (solver: Solver): boolean =>
  solver.places.every(places => places.size > 0) && solver.candidates.every(candidates => candidates.size > 0)

const prune = (solver: Solver, pruning: PruningId): boolean => {
  const level = PRUNINGS.indexOf(pruning)
  for (;;) {
    let changed = pruneAdjacency(solver)
    if (level >= 1) changed = pruneGapPaths(solver) || changed
    if (!consistent(solver)) return false
    if (!changed) return true
  }
}

const settledValue = (solver: Solver, value: number): number | undefined => {
  const places = solver.places[value - 1]
  return places.size === 1 && solver.values[[...places][0]] === undefined ? [...places][0] : undefined
}

/**
 * The next number to write down, and the reason for it — the first technique that fires on the board
 * as it stands. Ordered by how well the reason teaches: "it goes between these two" is the sentence
 * this family exists to teach, and "nothing else is left" is the one that teaches least.
 */
const firstStep = (solver: Solver): HidatoStep | undefined => {
  const neighbourOf = (cell: number, value: number) =>
    value >= 1 &&
    value <= solver.n &&
    solver.at[value - 1] !== undefined &&
    solver.neighbours[cell].includes(solver.at[value - 1]!)
      ? solver.cells[solver.at[value - 1]!]
      : undefined

  for (const technique of TECHNIQUES)
    for (let value = 1; value <= solver.n; value++) {
      if (technique === "onlyValue") continue
      const cell = settledValue(solver, value)
      if (cell === undefined) continue
      const before = neighbourOf(cell, value - 1)
      const after = neighbourOf(cell, value + 1)
      if (technique === "sandwich" && before && after)
        return {
          technique,
          value,
          cell: solver.cells[cell],
          evidence: [before, after],
          params: { value, before: value - 1, after: value + 1 },
        }
      if (technique === "neighbourForced" && (before || after) && !(before && after)) {
        const anchor = before ?? after!
        return {
          technique,
          value,
          cell: solver.cells[cell],
          evidence: [anchor],
          params: { value, from: before ? value - 1 : value + 1 },
        }
      }
      if (technique === "onlyCell")
        return { technique, value, cell: solver.cells[cell], evidence: [], params: { value } }
    }

  // Last: the cell that has run out of numbers rather than the number that has run out of cells. The
  // same fact from the other side, and the weaker sentence of the two, so it is asked last.
  for (let cell = 0; cell < solver.n; cell++)
    if (solver.values[cell] === undefined && solver.candidates[cell].size === 1) {
      const value = [...solver.candidates[cell]][0]
      return { technique: "onlyValue", value, cell: solver.cells[cell], evidence: [], params: { value } }
    }
  return undefined
}

const readValues = (solver: Solver): Record<string, number> =>
  Object.fromEntries(
    solver.cells.flatMap((cell, at) => (solver.values[at] === undefined ? [] : [[hexKey(cell), solver.values[at]!]]))
  )

/**
 * Fills the comb by deduction alone, at the strength a tier allows.
 *
 * Every step is forced, so a board this settles has exactly one solution and no separate solution
 * counter has to run — which is what lets generation gate on this one function (design doc §3).
 */
export const solveHidatoByTechniques = (
  puzzle: HidatoPuzzleData,
  pruning: PruningId,
  placed: Record<string, number> = puzzle.givens
): HidatoSolveResult => {
  const solver = createSolver(puzzle.cells, placed)
  const steps: HidatoStep[] = []
  if (!prune(solver, pruning)) return { settled: false, steps, values: readValues(solver) }
  for (;;) {
    const step = firstStep(solver)
    if (!step) break
    steps.push(step)
    place(
      solver,
      solver.cells.findIndex(cell => hexKey(cell) === hexKey(step.cell)),
      step.value
    )
    if (!prune(solver, pruning)) return { settled: false, steps, values: readValues(solver) }
  }
  const values = readValues(solver)
  return { settled: Object.keys(values).length === solver.n, steps, values }
}

/** The next step on the board as the PLAYER left it — the hint, straight out of the same ladder. */
export const nextHidatoStep = (
  puzzle: HidatoPuzzleData,
  placed: Record<string, number>,
  pruning: PruningId
): HidatoStep | undefined => {
  const solver = createSolver(puzzle.cells, placed)
  return prune(solver, pruning) ? firstStep(solver) : undefined
}

/** The first number the player has put somewhere it does not belong, or nothing if the board is clean. */
export const firstHidatoMistake = (
  placed: Record<string, number>,
  solution: Record<string, number>
): { cell: Hex; value: number } | undefined => {
  const wrong = Object.entries(placed).find(([key, value]) => solution[key] !== value)
  return wrong && { cell: { q: Number(wrong[0].split(",")[0]), r: Number(wrong[0].split(",")[1]) }, value: wrong[1] }
}
