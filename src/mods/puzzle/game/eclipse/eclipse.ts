/**
 * The eclipse board: a grid of suns and moons, and the three rules that decide which is which
 * (docs/game-design/puzzles/eclipse.md).
 *
 * Cells are addressed by a single index, `row * size + col`, because every rule here reads either a whole
 * line or a pair of neighbours — a nested array would be indexed back into flat form by all of them.
 */

export type Mark = "sun" | "moon"

/** A sign between two neighbouring cells: they match, or they differ. */
export type Link = {
  /** The two cells, always neighbours, always `a < b` so an edge has one representation. */
  a: number
  b: number
  kind: "same" | "different"
}

export type EclipsePuzzle = {
  /** Cells per side. Even, so a line can hold equal numbers of each mark. */
  size: number
  /** The marks the board opens with, and which the player cannot change. */
  given: readonly (Mark | undefined)[]
  links: readonly Link[]
}

/**
 * What is written on the board, and nothing else.
 *
 * The queries take this rather than the whole state: reading a rule never needs the undo stack, and a solver
 * that had to carry one would be a solver asked to know about buttons.
 */
export type EclipseMarks = {
  marks: readonly (Mark | undefined)[]
}

export type EclipseState = EclipseMarks & {
  /** Boards this one replaced, oldest first — the undo stack, the same shape futoshiki keeps. */
  past: readonly (readonly (Mark | undefined)[])[]
}

export const other = (mark: Mark): Mark => (mark === "sun" ? "moon" : "sun")

export const cellAt = (size: number, row: number, col: number) => row * size + col

export const rowOf = (size: number, cell: number) => Math.floor(cell / size)
export const colOf = (size: number, cell: number) => cell % size

/** Every row and every column, as cell indices — the lines all three line rules read. */
export const lines = (size: number): number[][] => [
  ...Array.from({ length: size }, (_unused, row) => Array.from({ length: size }, (_u, col) => cellAt(size, row, col))),
  ...Array.from({ length: size }, (_unused, col) => Array.from({ length: size }, (_u, row) => cellAt(size, row, col))),
]

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createEclipseState = (puzzle: EclipsePuzzle): EclipseState => ({ marks: [...puzzle.given], past: [] })

/** A given cell is part of the board rather than part of the answer, so it never takes a tap. */
export const isGiven = (puzzle: EclipsePuzzle, cell: number) => puzzle.given[cell] !== undefined

/**
 * What a tap does: empty → sun → moon → empty.
 *
 * Three states rather than two because a board this size is solved by holding "not yet known" as a real
 * answer — a two-state toggle would make every cell look decided from the first tap.
 */
export const cycleEclipseCell = (puzzle: EclipsePuzzle, state: EclipseState, cell: number): EclipseState => {
  if (isGiven(puzzle, cell)) return state
  const next = state.marks[cell] === undefined ? "sun" : state.marks[cell] === "sun" ? "moon" : undefined
  return {
    marks: state.marks.map((mark, index) => (index === cell ? next : mark)),
    past: [...state.past, state.marks].slice(-UNDO_LIMIT),
  }
}

/**
 * Steps the board back one tap.
 *
 * Worth having even though a tap is its own eraser: the cycle undoes ONE square, and what a player wants
 * back is the board before a run of squares they filled on a wrong reading. Futoshiki has it, so this has it
 * — the same button in the same place, or the family teaches its own controls twice.
 */
export const undoEclipse = (state: EclipseState): EclipseState => {
  const previous = state.past.at(-1)
  return previous ? { marks: previous, past: state.past.slice(0, -1) } : state
}

export const canUndoEclipse = (state: EclipseState): boolean => state.past.length > 0

/** Cells that break the no-three-in-a-row rule: three of the same mark running along a line. */
const tripleCells = (puzzle: EclipsePuzzle, marks: EclipseMarks["marks"]): number[] =>
  lines(puzzle.size).flatMap(line =>
    line.flatMap((_unused, index) => {
      const run = line.slice(index, index + 3)
      if (run.length < 3) return []
      const [first, second, third] = run.map(cell => marks[cell])
      return first !== undefined && first === second && second === third ? run : []
    })
  )

/** Cells in a line that already holds more than half of one mark, which no balanced line can. */
const overfilledCells = (puzzle: EclipsePuzzle, marks: EclipseMarks["marks"]): number[] =>
  lines(puzzle.size).flatMap(line => {
    const half = puzzle.size / 2
    return (["sun", "moon"] as Mark[]).flatMap(mark => {
      const held = line.filter(cell => marks[cell] === mark)
      return held.length > half ? held : []
    })
  })

/**
 * Cells in a finished line that is a copy of another finished line of the same kind.
 *
 * Rows are only ever compared with rows and columns with columns: a row and a column reading the same is
 * a coincidence about a board, not a rule about one.
 */
const copiedCells = (puzzle: EclipsePuzzle, marks: EclipseMarks["marks"]): number[] => {
  const { size } = puzzle
  const rows = lines(size).slice(0, size)
  const cols = lines(size).slice(size)
  return [rows, cols].flatMap(group => {
    const done = group.filter(line => line.every(cell => marks[cell] !== undefined))
    return done.flatMap((line, index) =>
      done.some(
        (other, otherIndex) => otherIndex !== index && other.every((cell, at) => marks[cell] === marks[line[at]])
      )
        ? line
        : []
    )
  })
}

/** Signs whose two cells are both filled and disagree with what the sign asks. */
export const brokenLinks = (puzzle: EclipsePuzzle, state: EclipseMarks): Link[] =>
  puzzle.links.filter(link => {
    const [a, b] = [state.marks[link.a], state.marks[link.b]]
    if (a === undefined || b === undefined) return false
    return link.kind === "same" ? a !== b : a === b
  })

/**
 * Every cell the board can already prove wrong.
 *
 * Shown as it happens rather than on a check button: a rule the player has broken is a fact about the board,
 * and hiding it until the end turns a deduction game into a submit-and-see one.
 */
export const eclipseConflicts = (puzzle: EclipsePuzzle, state: EclipseMarks): Set<number> =>
  new Set([
    ...tripleCells(puzzle, state.marks),
    ...overfilledCells(puzzle, state.marks),
    ...copiedCells(puzzle, state.marks),
    ...brokenLinks(puzzle, state).flatMap(link => [link.a, link.b]),
  ])

export const eclipseSolved = (puzzle: EclipsePuzzle, state: EclipseMarks) =>
  state.marks.every(mark => mark !== undefined) && eclipseConflicts(puzzle, state).size === 0

/**
 * The first mark on the board that contradicts the answer, if any.
 *
 * A hint engine has to check this first: every technique reasons from what the player has written down, so
 * once one mark is wrong the deductions after it are advice toward a dead end.
 */
export const firstEclipseMistake = (marks: EclipseMarks["marks"], solution: readonly Mark[]): number | undefined => {
  const wrong = marks.findIndex((mark, cell) => mark !== undefined && mark !== solution[cell])
  return wrong === -1 ? undefined : wrong
}
