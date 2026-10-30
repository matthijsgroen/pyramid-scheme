/**
 * The pair puzzle board: pieces placed beside printed anchors under two counts and one adjacency rule.
 *
 * Cells are addressed by a single index, `row * size + col`, as in star battle. The answer is the piece
 * positions alone; which piece belongs to which anchor is never shown, only checked.
 */
import { colOf, neighboursOf, rowOf } from "../starBattle/starBattle"

/** What a player writes in a square. `empty` is their own bookkeeping — the answer is the pieces alone. */
export type PairMark = "piece" | "empty"

export type PairPuzzle = {
  size: number
  /** Cells that print an anchor. Never marked; every anchor owns exactly one piece next to it. */
  anchors: readonly boolean[]
  rowCounts: readonly number[]
  colCounts: readonly number[]
}

export type PairMarks = {
  marks: readonly (PairMark | undefined)[]
}

export type PairState = PairMarks & {
  /** Boards this one replaced, oldest first — the undo stack. */
  past: readonly (readonly (PairMark | undefined)[])[]
}

export type LineStatus = "open" | "met" | "broken"

const UNDO_LIMIT = 200

export const createPairState = (puzzle: PairPuzzle): PairState => ({
  marks: new Array(puzzle.size * puzzle.size).fill(undefined),
  past: [],
})

/** What a tap does: empty → "empty" → "piece" → empty. Anchors are not the player's to mark. */
export const cyclePairCell = (state: PairState, cell: number, puzzle: PairPuzzle): PairState => {
  if (puzzle.anchors[cell]) return state
  const next = state.marks[cell] === undefined ? "empty" : state.marks[cell] === "empty" ? "piece" : undefined
  return {
    marks: state.marks.map((mark, index) => (index === cell ? next : mark)),
    past: [...state.past, state.marks].slice(-UNDO_LIMIT),
  }
}

/** Marks a run of open cells "empty" in one undo step; cells already marked are left as they are. */
export const sweepPairCells = (state: PairState, cells: readonly number[], puzzle: PairPuzzle): PairState => {
  const ruling = cells.filter(cell => !state.marks[cell] && !puzzle.anchors[cell])
  if (!ruling.length) return state
  return {
    marks: state.marks.map((mark, index) => (ruling.includes(index) ? "empty" : mark)),
    past: [...state.past, state.marks].slice(-UNDO_LIMIT),
  }
}

export const undoPair = (state: PairState): PairState => {
  const previous = state.past.at(-1)
  return previous ? { marks: previous, past: state.past.slice(0, -1) } : state
}

export const canUndoPair = (state: PairState): boolean => state.past.length > 0

/** The up/down/left/right squares of a cell. */
const orthogonalOf = (size: number, cell: number): number[] =>
  neighboursOf(size, cell).filter(at => rowOf(size, at) === rowOf(size, cell) || colOf(size, at) === colOf(size, cell))

const anchorCells = (puzzle: PairPuzzle): number[] => puzzle.anchors.flatMap((a, cell) => (a ? [cell] : []))

/**
 * Whether the pieces can be dealt out one to an anchor: bipartite matching, each piece beside its own
 * anchor and every anchor used once. Counts alone cannot tell, because two pieces may crowd one anchor.
 */
export const hasPerfectPairing = (puzzle: PairPuzzle, pieces: readonly boolean[]): boolean => {
  const pieceCells = pieces.flatMap((p, cell) => (p ? [cell] : []))
  const anchors = anchorCells(puzzle)
  if (pieceCells.length !== anchors.length) return false
  const owner = new Map<number, number>()
  const assign = (piece: number, seen: Set<number>): boolean =>
    orthogonalOf(puzzle.size, piece).some(anchor => {
      if (!puzzle.anchors[anchor] || seen.has(anchor)) return false
      seen.add(anchor)
      const held = owner.get(anchor)
      if (held !== undefined && !assign(held, seen)) return false
      owner.set(anchor, piece)
      return true
    })
  return pieceCells.every(piece => assign(piece, new Set()))
}

const lineOf = (puzzle: PairPuzzle, marks: PairMarks["marks"], cells: number[], count: number): LineStatus => {
  const pieces = cells.filter(cell => marks[cell] === "piece").length
  const reachable = cells.filter(cell => !marks[cell] && !puzzle.anchors[cell]).length
  if (pieces > count || pieces + reachable < count) return "broken"
  return pieces === count ? "met" : "open"
}

const rowCells = (size: number, row: number) => Array.from({ length: size }, (_u, col) => row * size + col)
const colCells = (size: number, col: number) => Array.from({ length: size }, (_u, row) => row * size + col)

export const lineStatus = (
  puzzle: PairPuzzle,
  marks: PairMarks["marks"]
): { rows: LineStatus[]; cols: LineStatus[] } => ({
  rows: puzzle.rowCounts.map((count, row) => lineOf(puzzle, marks, rowCells(puzzle.size, row), count)),
  cols: puzzle.colCounts.map((count, col) => lineOf(puzzle, marks, colCells(puzzle.size, col), count)),
})

/**
 * Every piece the board can already prove wrong: touching another piece, standing beside no anchor, or
 * sitting in a line that holds more than it owes. An unfinished line is not a fault.
 */
export const pairConflicts = (puzzle: PairPuzzle, state: PairMarks): Set<number> => {
  const { size } = puzzle
  const { marks } = state
  const pieces = marks.flatMap((mark, cell) => (mark === "piece" ? [cell] : []))
  const bad = new Set<number>()
  pieces.forEach(cell => {
    if (neighboursOf(size, cell).some(at => marks[at] === "piece")) bad.add(cell)
    if (!orthogonalOf(size, cell).some(at => puzzle.anchors[at])) bad.add(cell)
  })
  const overfull = (cells: number[], count: number) => {
    const held = cells.filter(cell => marks[cell] === "piece")
    if (held.length > count) held.forEach(cell => bad.add(cell))
  }
  puzzle.rowCounts.forEach((count, row) => overfull(rowCells(size, row), count))
  puzzle.colCounts.forEach((count, col) => overfull(colCells(size, col), count))
  return bad
}

/** A finished board: counts exact, no conflicts, and the pieces deal out to the anchors one each. */
export const pairSolved = (puzzle: PairPuzzle, state: PairMarks): boolean => {
  const { size } = puzzle
  const { marks } = state
  const held = (cells: number[]) => cells.filter(cell => marks[cell] === "piece").length
  return (
    puzzle.rowCounts.every((count, row) => held(rowCells(size, row)) === count) &&
    puzzle.colCounts.every((count, col) => held(colCells(size, col)) === count) &&
    pairConflicts(puzzle, state).size === 0 &&
    hasPerfectPairing(
      puzzle,
      marks.map(mark => mark === "piece")
    )
  )
}

/** The eight neighbours of each piece, shown as spent rather than written; anchors are never ruled out. */
export const ruledOutByPieces = (puzzle: PairPuzzle, marks: PairMarks["marks"]): Set<number> =>
  new Set(
    marks
      .flatMap((mark, cell) => (mark === "piece" ? neighboursOf(puzzle.size, cell) : []))
      .filter(at => !puzzle.anchors[at])
  )

/** The first mark contradicting the answer, wrong `empty` included: it stalls a board as thoroughly. */
export const firstPairMistake = (marks: PairMarks["marks"], solution: readonly boolean[]): number | undefined => {
  const wrong = marks.findIndex(
    (mark, cell) => (mark === "piece" && !solution[cell]) || (mark === "empty" && solution[cell])
  )
  return wrong === -1 ? undefined : wrong
}
