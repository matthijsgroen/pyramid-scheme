// The deduction system behind both generation and hints, per docs/game-design/puzzles/sumplete.md §4.
// Techniques are ordered by how well their reason EXPLAINS itself, not by strength: the last one
// subsumes every earlier one, so ranking it first would make every hint "I enumerated every subset",
// which teaches nothing. Among the cheap ones, the strike-producing techniques come before the
// keep-producing one: crossing a number out moves the board on, confirming what stays is bookkeeping
// the player only needs when there is nothing to cross out.
export const TECHNIQUES = ["tooBig", "allStrike", "allKeep", "parity", "onlyCombination", "inEveryCombination"] as const

export type TechniqueId = (typeof TECHNIQUES)[number]

export type SumpleteMark = "unknown" | "keep" | "strike"

export type SumpletePuzzleData = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
}

export type SumpleteCellRef = { row: number; col: number }

export type SumpleteStep = {
  technique: TechniqueId
  line: "row" | "col"
  index: number
  /** What the kept cells in this line still need — the number every technique reasons about. */
  deficit: number
  /** The single value the reason names, where there is one (too big, the lone odd number). */
  value?: number
  decisions: (SumpleteCellRef & { mark: "keep" | "strike" })[]
}

type LineCell = SumpleteCellRef & { value: number; mark: SumpleteMark }

type Line = { kind: "row" | "col"; index: number; target: number; cells: LineCell[] }

const linesOf = (puzzle: SumpletePuzzleData, marks: SumpleteMark[][]): Line[] => {
  const rows: Line[] = puzzle.grid.map((values, row) => ({
    kind: "row" as const,
    index: row,
    target: puzzle.rowTargets[row],
    cells: values.map((value, col) => ({ row, col, value, mark: marks[row][col] })),
  }))
  const cols: Line[] = puzzle.colTargets.map((target, col) => ({
    kind: "col" as const,
    index: col,
    target,
    cells: puzzle.grid.map((values, row) => ({ row, col, value: values[col], mark: marks[row][col] })),
  }))
  return [...rows, ...cols]
}

// Every combination of the undecided cells that reaches the deficit exactly, as index sets into
// `cells`. Equal values in one line produce SEPARATE combinations here (index sets, not value
// multisets), which is what stops "only one combination" from claiming a forced answer where
// swapping two identical numbers gives another (§4.2).
const combinations = (cells: LineCell[], deficit: number): number[][] => {
  const found: number[][] = []
  const walk = (index: number, remaining: number, picked: number[]) => {
    if (remaining === 0) found.push([...picked])
    if (index === cells.length || remaining <= 0) return
    picked.push(index)
    walk(index + 1, remaining - cells[index].value, picked)
    picked.pop()
    walk(index + 1, remaining, picked)
  }
  walk(0, deficit, [])
  return found
}

type Technique = (
  line: Line,
  deficit: number,
  unknown: LineCell[]
) => Omit<SumpleteStep, "technique" | "line" | "index" | "deficit"> | undefined

const decide = (cells: LineCell[], mark: "keep" | "strike") => cells.map(({ row, col }) => ({ row, col, mark }))

const IMPLEMENTATIONS: Record<TechniqueId, Technique> = {
  // A cell bigger than what is still needed can never be part of the answer. Silent on a met target,
  // where "already reached, strike the rest" is the same decision with a far better reason.
  tooBig: (_line, deficit, unknown) => {
    if (deficit === 0) return undefined
    const cells = unknown.filter(cell => cell.value > deficit)
    return cells.length ? { decisions: decide(cells, "strike"), value: cells[0].value } : undefined
  },
  // Everything still open is needed to reach the target.
  allKeep: (_line, deficit, unknown) =>
    unknown.reduce((sum, cell) => sum + cell.value, 0) === deficit ? { decisions: decide(unknown, "keep") } : undefined,
  // The target is already reached, so nothing else may stay.
  allStrike: (_line, deficit, unknown) => (deficit === 0 ? { decisions: decide(unknown, "strike") } : undefined),
  // The kept numbers must add up to an odd deficit exactly when an odd count of them is odd. With one
  // odd number left, that decides it outright — and the reason is a sentence a player repeats back.
  parity: (_line, deficit, unknown) => {
    const odd = unknown.filter(cell => cell.value % 2 === 1)
    if (odd.length !== 1) return undefined
    return { decisions: decide(odd, deficit % 2 === 1 ? "keep" : "strike"), value: odd[0].value }
  },
  // Exactly one combination reaches the deficit: it stays, the rest goes.
  onlyCombination: (_line, deficit, unknown) => {
    const combos = combinations(unknown, deficit)
    if (combos.length !== 1) return undefined
    const keep = new Set(combos[0])
    return {
      decisions: [
        ...decide(
          unknown.filter((_, i) => keep.has(i)),
          "keep"
        ),
        ...decide(
          unknown.filter((_, i) => !keep.has(i)),
          "strike"
        ),
      ],
    }
  },
  // Last resort: a cell every combination uses must stay, one no combination uses must go. Exact, and
  // it subsumes the whole ladder — but its reason is unexplainable, hence its rank (§4.1).
  inEveryCombination: (_line, deficit, unknown) => {
    const combos = combinations(unknown, deficit)
    if (combos.length === 0) return undefined
    const counts = unknown.map((_, i) => combos.filter(combo => combo.includes(i)).length)
    const decisions = [
      ...decide(
        unknown.filter((_, i) => counts[i] === combos.length),
        "keep"
      ),
      ...decide(
        unknown.filter((_, i) => counts[i] === 0),
        "strike"
      ),
    ]
    return decisions.length ? { decisions } : undefined
  },
}

export const techniqueRank = (id: TechniqueId): number => TECHNIQUES.indexOf(id)

/**
 * The cheapest technique that decides something on this board, or undefined when nothing is forced.
 * Ties break on the smallest deficit — the small clues are where the player is being taught to look,
 * so hints arrive in that order (§6).
 */
export const nextStep = (
  puzzle: SumpletePuzzleData,
  marks: SumpleteMark[][],
  cap: TechniqueId = "inEveryCombination"
): SumpleteStep | undefined => {
  const lines = linesOf(puzzle, marks)
  for (const technique of TECHNIQUES.slice(0, techniqueRank(cap) + 1)) {
    const steps = lines.flatMap(line => {
      const unknown = line.cells.filter(cell => cell.mark === "unknown")
      if (!unknown.length) return []
      const kept = line.cells.reduce((sum, cell) => sum + (cell.mark === "keep" ? cell.value : 0), 0)
      const deficit = line.target - kept
      // A player can over-keep a line; nothing is deducible there until they undo something.
      if (deficit < 0) return []
      const found = IMPLEMENTATIONS[technique](line, deficit, unknown)
      return found ? [{ technique, line: line.kind, index: line.index, deficit, ...found }] : []
    })
    if (steps.length) return steps.reduce((best, step) => (step.deficit < best.deficit ? step : best))
  }
  return undefined
}

/**
 * The first mark that contradicts the answer, if any. A hint engine must check this first: every
 * technique reasons from the marks the player made, so once one of them is wrong the deductions
 * that follow are advice toward a dead end. "This one can't be right" is the useful hint there.
 */
export const firstMistake = (marks: SumpleteMark[][], solution: boolean[][]): SumpleteCellRef | undefined => {
  for (let row = 0; row < marks.length; row++)
    for (let col = 0; col < marks[row].length; col++) {
      const mark = marks[row][col]
      if (mark === "unknown") continue
      if ((mark === "keep") !== solution[row][col]) return { row, col }
    }
  return undefined
}

export type SumpleteSolveResult = {
  marks: SumpleteMark[][]
  /** Every cell decided by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: SumpleteStep[]
  /** The strongest technique the board actually demanded, undefined for an already-solved board. */
  deepest?: TechniqueId
}

export const emptyMarks = (size: number): SumpleteMark[][] =>
  Array.from({ length: size }, () => new Array<SumpleteMark>(size).fill("unknown"))

/** Applies techniques up to `cap` until nothing more is forced. */
export const solveByTechniques = (
  puzzle: SumpletePuzzleData,
  cap: TechniqueId = "inEveryCombination"
): SumpleteSolveResult => {
  const marks = emptyMarks(puzzle.grid.length)
  const steps: SumpleteStep[] = []
  for (let step = nextStep(puzzle, marks, cap); step; step = nextStep(puzzle, marks, cap)) {
    for (const { row, col, mark } of step.decisions) marks[row][col] = mark
    steps.push(step)
  }
  return {
    marks,
    settled: marks.every(row => row.every(mark => mark !== "unknown")),
    steps,
    deepest: steps.reduce<TechniqueId | undefined>(
      (deepest, step) =>
        !deepest || techniqueRank(step.technique) > techniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}
