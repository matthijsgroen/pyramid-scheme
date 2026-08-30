// The deduction system behind both generation and hints, per docs/game-design/puzzles/sudoku.md §4.
//
// Four rungs, and the ladder stops there because the GRID stops there. The subsets every larger
// sudoku turns on — a naked pair, a hidden pair, a triple, an x-wing — were built and measured, and
// not one of them ever fired: a group only six squares wide leaves a pair one step behind a single
// that fires first, so every board they might have decided was already decided (design doc §11).
// Rungs nothing can reach are not a ceiling to grow into, they are dead weight in the ladder and a
// tier table that promises reasoning no board demands.
//
// Placements come before eliminations — writing a value in moves the board on, while ruling one out
// is the bookkeeping that gets you there — and the two box-line rungs are ordered by which side of
// the argument is easier to say out loud, not by strength.
export const TECHNIQUES = ["nakedSingle", "hiddenSingle", "pointing", "claiming"] as const

export type TechniqueId = (typeof TECHNIQUES)[number]

export type SudokuCellRef = { row: number; col: number }

/**
 * The grid and how it is divided — everything that is true of a board before anything is written on
 * it, which is what the geometry below is worked out from.
 *
 * The chamber shape is carried rather than derived, because it is the one thing about this family a
 * glance has to settle: 6 wide divided into 2-wide, 3-tall chambers stands three chambers across and
 * two down, and the same 36 squares cut the other way is a different puzzle to solve and to look at.
 */
export type SudokuShape = {
  size: number
  /** How many columns one chamber spans. */
  boxWidth: number
  /** How many rows one chamber spans. */
  boxHeight: number
}

export type SudokuPuzzleData = SudokuShape & {
  /** Pre-filled squares; undefined where the player supplies the value. */
  givens: (number | undefined)[][]
}

export type SudokuValues = (number | undefined)[][]

/** What the player has pencilled into each square, in the same shape as the grid. */
export type SudokuNotes = number[][][]

export type SudokuDecision =
  | { kind: "place"; row: number; col: number; value: number }
  | { kind: "eliminate"; row: number; col: number; values: number[] }

export type SudokuStep = {
  technique: TechniqueId
  /** Which reading of the technique fired — each one is a different sentence to the player. */
  variant?: string
  /** The squares the reason talks about, the decided one first. */
  cells: SudokuCellRef[]
  /** The squares the reason argues FROM, where those are not the ones it settles. */
  evidence?: SudokuCellRef[]
  params: { value?: number }
  decisions: SudokuDecision[]
}

/** A board mid-deduction: what is written down, and what is still possible everywhere else. */
export type SudokuBoard = {
  puzzle: SudokuPuzzleData
  values: SudokuValues
  candidates: Set<number>[][]
}

export const sudokuCellKey = (row: number, col: number): string => `${row},${col}`

const range = (size: number): number[] => Array.from({ length: size }, (_, i) => i + 1)

/** How many chambers stand side by side across the grid. */
export const boxesPerRow = ({ size, boxWidth }: SudokuShape): number => size / boxWidth

/** Which chamber a square belongs to, numbered left to right and then down. */
export const boxIndexOf = (shape: SudokuShape, row: number, col: number): number =>
  Math.floor(row / shape.boxHeight) * boxesPerRow(shape) + Math.floor(col / shape.boxWidth)

/**
 * How many chambers the grid is cut into — on any sudoku, the width of the grid. The six squares of a
 * chamber and the six of a row hold the same six values, so the board divides into the same count either
 * way. Named rather than written out at the call site, because `size` there is a claim about nothing.
 */
export const boxCount = ({ size, boxWidth, boxHeight }: SudokuShape): number => (size * size) / (boxWidth * boxHeight)

/** The top-left square of a chamber — where anything drawn OVER a whole chamber has to start. */
export const boxOriginOf = (shape: SudokuShape, box: number): SudokuCellRef => ({
  row: Math.floor(box / boxesPerRow(shape)) * shape.boxHeight,
  col: (box % boxesPerRow(shape)) * shape.boxWidth,
})

export type Unit = { kind: "row" | "col" | "box"; index: number; cells: SudokuCellRef[] }

type Geometry = { units: Unit[]; peers: SudokuCellRef[][][]; unitsBy: Record<"row" | "col" | "box", Unit[]> }

// Every board of one shape has the same rows, columns, chambers and neighbourhoods, and a generator
// solves a 6x6 hundreds of times over while it digs. Building all of that once per SHAPE rather than
// once per call is what keeps that affordable; the table is three entries deep at most, one per
// authored grid.
const GEOMETRIES = new Map<string, Geometry>()

const buildGeometry = (shape: SudokuShape): Geometry => {
  const { size, boxWidth, boxHeight } = shape
  const rows: Unit[] = Array.from({ length: size }, (_unused, row) => ({
    kind: "row",
    index: row,
    cells: Array.from({ length: size }, (_unused2, col) => ({ row, col })),
  }))
  const cols: Unit[] = Array.from({ length: size }, (_unused, col) => ({
    kind: "col",
    index: col,
    cells: Array.from({ length: size }, (_unused2, row) => ({ row, col })),
  }))
  const boxes: Unit[] = Array.from({ length: boxCount(shape) }, (_unused, box) => {
    const { row: top, col: left } = boxOriginOf(shape, box)
    return {
      kind: "box" as const,
      index: box,
      cells: Array.from({ length: boxHeight }, (_unused2, dy) =>
        Array.from({ length: boxWidth }, (_unused3, dx) => ({ row: top + dy, col: left + dx }))
      ).flat(),
    }
  })
  const units = [...rows, ...cols, ...boxes]
  const peers = Array.from({ length: size }, (_unused, row) =>
    Array.from({ length: size }, (_unused2, col) => {
      const seen = new Map<string, SudokuCellRef>()
      for (const unit of units) {
        if (!unit.cells.some(cell => cell.row === row && cell.col === col)) continue
        for (const cell of unit.cells) {
          if (cell.row === row && cell.col === col) continue
          seen.set(sudokuCellKey(cell.row, cell.col), cell)
        }
      }
      return [...seen.values()]
    })
  )
  return { units, peers, unitsBy: { row: rows, col: cols, box: boxes } }
}

const geometryOf = (shape: SudokuShape): Geometry => {
  const key = `${shape.size}:${shape.boxWidth}x${shape.boxHeight}`
  const known = GEOMETRIES.get(key)
  if (known) return known
  const built = buildGeometry(shape)
  GEOMETRIES.set(key, built)
  return built
}

/**
 * The three kinds of group a value may appear in once: the rows, the columns and the chambers.
 *
 * Every technique below reasons over this one list rather than over rows and columns with the
 * chambers bolted on, which is what keeps the ladder honest — a hidden single in a chamber is the
 * same reason as one in a row, and a family that only looked at lines would silently rank it lower.
 */
export const unitsOf = (shape: SudokuShape): Unit[] => geometryOf(shape).units

/** The rows, the columns or the chambers on their own, for the two rungs that play one off another. */
const unitsOfKind = (shape: SudokuShape, kind: "row" | "col" | "box"): Unit[] => geometryOf(shape).unitsBy[kind]

/** Every square that shares a row, a column or a chamber with this one. */
export const peersOf = (shape: SudokuShape, row: number, col: number): SudokuCellRef[] =>
  geometryOf(shape).peers[row][col]

/**
 * The starting point for every deduction: each empty square may hold any value its row, its column
 * and its chamber do not already show. The player's own notes narrow that further where they wrote
 * some, so a hint never repeats an elimination they already made. Notes that leave a square with
 * nothing are ignored rather than trusted — a board is not made undecidable by a slip of the pencil.
 */
export const createSudokuBoard = (puzzle: SudokuPuzzleData, values: SudokuValues, notes?: SudokuNotes): SudokuBoard => {
  const { size } = puzzle
  const candidates = values.map((cells, row) =>
    cells.map((value, col) => {
      if (value !== undefined) return new Set<number>()
      const taken = new Set<number>()
      for (const peer of peersOf(puzzle, row, col)) {
        const held = values[peer.row][peer.col]
        if (held !== undefined) taken.add(held)
      }
      const open = range(size).filter(candidate => !taken.has(candidate))
      const written = notes?.[row]?.[col]
      const narrowed = written?.length ? open.filter(candidate => written.includes(candidate)) : open
      return new Set(narrowed.length ? narrowed : open)
    })
  )
  return { puzzle, values: values.map(cells => [...cells]), candidates }
}

const applyDecision = (board: SudokuBoard, decision: SudokuDecision) => {
  if (decision.kind === "eliminate") {
    for (const value of decision.values) board.candidates[decision.row][decision.col].delete(value)
    return
  }
  board.values[decision.row][decision.col] = decision.value
  board.candidates[decision.row][decision.col] = new Set()
  for (const peer of peersOf(board.puzzle, decision.row, decision.col))
    board.candidates[peer.row][peer.col].delete(decision.value)
}

// A decision found earlier in the same pass can settle a later one; re-checking here is what lets the
// solver apply a whole technique's harvest at once instead of re-scanning after every single square.
const stillChanges = (board: SudokuBoard, decision: SudokuDecision): boolean =>
  decision.kind === "place"
    ? board.values[decision.row][decision.col] === undefined
    : decision.values.some(value => board.candidates[decision.row][decision.col].has(value))

const sameCell = (a: SudokuCellRef, b: SudokuCellRef): boolean => a.row === b.row && a.col === b.col

const eliminate = (board: SudokuBoard, cell: SudokuCellRef, values: number[]): SudokuDecision[] => {
  const live = values.filter(value => board.candidates[cell.row][cell.col].has(value))
  return live.length ? [{ kind: "eliminate", row: cell.row, col: cell.col, values: live }] : []
}

const hostsOf = (board: SudokuBoard, unit: Unit, value: number): SudokuCellRef[] =>
  unit.cells.filter(cell => board.candidates[cell.row][cell.col].has(value))

/**
 * The squares that SHUT THE OTHERS OUT: every square already showing this value that shares a row, a
 * column or a chamber with an empty square of this unit.
 *
 * **A hidden single argues from squares that are not in the unit at all**, which is what makes it the
 * one rung a player can read and still not see. "Nowhere else in this row" is a claim about six
 * squares, and the reason each of the other five is out stands somewhere off the row. So the hint
 * rings them, and the sentence stops being something to take on trust.
 *
 * Squares of the unit that already hold a value are left out: they show their own reason.
 */
const blockersOf = (board: SudokuBoard, unit: Unit, value: number, host: SudokuCellRef): SudokuCellRef[] => {
  const found = new Map<string, SudokuCellRef>()
  for (const cell of unit.cells) {
    if (sameCell(cell, host) || board.values[cell.row][cell.col] !== undefined) continue
    for (const peer of peersOf(board.puzzle, cell.row, cell.col))
      if (board.values[peer.row][peer.col] === value) found.set(sudokuCellKey(peer.row, peer.col), peer)
  }
  return [...found.values()]
}

/** The values a unit is still missing — the only ones any technique over it has anything to say about. */
const openValues = (board: SudokuBoard, unit: Unit): number[] => {
  const placed = new Set(unit.cells.map(cell => board.values[cell.row][cell.col]))
  return range(board.puzzle.size).filter(value => !placed.has(value))
}

type Technique = (board: SudokuBoard) => SudokuStep[]

const IMPLEMENTATIONS: Record<TechniqueId, Technique> = {
  // Nothing else fits: the row, the column and the chamber have used up every other value.
  nakedSingle: board =>
    board.values.flatMap((cells, row) =>
      cells.flatMap((value, col) => {
        if (value !== undefined || board.candidates[row][col].size !== 1) return []
        const only = [...board.candidates[row][col]][0]
        return [
          {
            technique: "nakedSingle" as const,
            cells: [{ row, col }],
            params: { value: only },
            decisions: [{ kind: "place" as const, row, col, value: only }],
          },
        ]
      })
    ),

  // A value with nowhere else to go in its row, column or chamber, even though this square could
  // hold others.
  hiddenSingle: board =>
    unitsOf(board.puzzle).flatMap(unit =>
      openValues(board, unit).flatMap(value => {
        const hosts = hostsOf(board, unit, value)
        if (hosts.length !== 1) return []
        return [
          {
            technique: "hiddenSingle" as const,
            variant: unit.kind,
            cells: [hosts[0]],
            evidence: blockersOf(board, unit, value, hosts[0]),
            params: { value },
            decisions: [{ kind: "place" as const, row: hosts[0].row, col: hosts[0].col, value }],
          },
        ]
      })
    ),

  // Every square in a chamber that could take a value stands in one row (or one column). The value is
  // going somewhere in this chamber, so it is going somewhere on that line — and nowhere else on it.
  pointing: board =>
    unitsOfKind(board.puzzle, "box").flatMap(box =>
      openValues(board, box).flatMap(value => {
        const hosts = hostsOf(board, box, value)
        if (hosts.length < 2) return []
        const steps: SudokuStep[] = []
        for (const along of ["row", "col"] as const) {
          const lane = along === "row" ? hosts[0].row : hosts[0].col
          if (!hosts.every(cell => (along === "row" ? cell.row : cell.col) === lane)) continue
          const line = unitsOfKind(board.puzzle, along)[lane]
          const decisions = line.cells
            .filter(cell => !hosts.some(host => sameCell(host, cell)))
            .flatMap(cell => eliminate(board, cell, [value]))
          if (!decisions.length) continue
          steps.push({
            technique: "pointing",
            variant: along,
            cells: decisions.map(decision => ({ row: decision.row, col: decision.col })),
            evidence: hosts,
            params: { value },
            decisions,
          })
        }
        return steps
      })
    ),

  // The mirror of pointing, read from the line's side: every square on a row (or column) that could
  // take a value sits inside one chamber, so the rest of that chamber cannot have it.
  claiming: board =>
    [...unitsOfKind(board.puzzle, "row"), ...unitsOfKind(board.puzzle, "col")].flatMap(line =>
      openValues(board, line).flatMap(value => {
        const hosts = hostsOf(board, line, value)
        if (hosts.length < 2) return []
        const box = boxIndexOf(board.puzzle, hosts[0].row, hosts[0].col)
        if (!hosts.every(cell => boxIndexOf(board.puzzle, cell.row, cell.col) === box)) return []
        const chamber = unitsOfKind(board.puzzle, "box")[box]
        const decisions = chamber.cells
          .filter(cell => !hosts.some(host => sameCell(host, cell)))
          .flatMap(cell => eliminate(board, cell, [value]))
        if (!decisions.length) return []
        return [
          {
            technique: "claiming" as const,
            variant: line.kind,
            cells: decisions.map(decision => ({ row: decision.row, col: decision.col })),
            evidence: hosts,
            params: { value },
            decisions,
          },
        ]
      })
    ),
}

export const techniqueRank = (id: TechniqueId): number => TECHNIQUES.indexOf(id)

/**
 * The cheapest technique that decides something on this board, or undefined when nothing is forced.
 * Which techniques are allowed comes from the board's own tier, so a starter board never explains
 * itself with reasoning it was never built to need.
 *
 * `allowed` is a SET rather than a depth, and has to be: the ladder interleaves the pairs and the
 * triples, so a tier that wants naked subsets without hidden ones is not a prefix of it. It must stay
 * in ladder order, because taking the first technique that fires is what keeps hints cheap.
 */
export const nextSudokuStep = (
  board: SudokuBoard,
  allowed: readonly TechniqueId[] = TECHNIQUES
): SudokuStep | undefined => {
  for (const technique of allowed) {
    const steps = IMPLEMENTATIONS[technique](board)
    if (steps.length) return steps[0]
  }
  return undefined
}

export type SudokuSolveResult = {
  values: SudokuValues
  /** Every square decided by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: SudokuStep[]
  /** The strongest technique the board actually demanded, undefined for an already-solved board. */
  deepest?: TechniqueId
}

const MAX_PASSES = 2000

/** Carries a board as far as the `allowed` techniques can take it, in place. */
export const applySudokuTechniques = (
  board: SudokuBoard,
  allowed: readonly TechniqueId[] = TECHNIQUES
): SudokuStep[] => {
  const steps: SudokuStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // Short-circuit deliberately: only the cheapest technique that fires is spent, and the dear ones
    // at the end of the ladder are the whole reason. Mapping the ladder and then taking the first
    // non-empty result ran every technique on every pass, the triples included.
    let harvest: SudokuStep[] | undefined
    for (const technique of allowed) {
      const found = IMPLEMENTATIONS[technique](board)
      if (found.length) {
        harvest = found
        break
      }
    }
    if (!harvest) break
    for (const step of harvest) {
      const live = step.decisions.filter(decision => stillChanges(board, decision))
      if (!live.length) continue
      for (const decision of live) applyDecision(board, decision)
      steps.push(step)
    }
  }
  return steps
}

/** Applies the `allowed` techniques until nothing more is forced. */
export const solveSudokuByTechniques = (
  puzzle: SudokuPuzzleData,
  allowed: readonly TechniqueId[] = TECHNIQUES
): SudokuSolveResult => {
  const board = createSudokuBoard(puzzle, puzzle.givens)
  const steps = applySudokuTechniques(board, allowed)
  return {
    values: board.values,
    settled: board.values.every(cells => cells.every(value => value !== undefined)),
    steps,
    deepest: steps.reduce<TechniqueId | undefined>(
      (deepest, step) =>
        !deepest || techniqueRank(step.technique) > techniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}

export type SudokuMistake = SudokuCellRef & { kind: "value" | "note" }

/**
 * The first thing on the board that contradicts the answer, if any. A hint engine must check this
 * first: every technique reasons from what the player wrote down, so once a value or a note is wrong
 * the deductions that follow are advice toward a dead end.
 */
export const firstSudokuMistake = (
  values: SudokuValues,
  notes: SudokuNotes,
  solution: number[][]
): SudokuMistake | undefined => {
  for (let row = 0; row < solution.length; row++)
    for (let col = 0; col < solution.length; col++) {
      const value = values[row][col]
      if (value !== undefined && value !== solution[row][col]) return { row, col, kind: "value" }
    }
  for (let row = 0; row < solution.length; row++)
    for (let col = 0; col < solution.length; col++) {
      const written = notes[row][col]
      if (values[row][col] === undefined && written.length && !written.includes(solution[row][col]))
        return { row, col, kind: "note" }
    }
  return undefined
}
