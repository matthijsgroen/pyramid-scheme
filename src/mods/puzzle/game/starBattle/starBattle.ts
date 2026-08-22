/**
 * The Star Battle board: stars placed under three counts and one adjacency rule
 * (docs/game-design/puzzles/star-battle.md).
 *
 * Cells are addressed by a single index, `row * size + col`, the same way eclipse addresses its grid: every
 * rule here reads a whole group or a cell's eight neighbours, and both want flat indices.
 */

/** What a player writes in a square. `dark` is their own bookkeeping — the answer is the stars alone. */
export type CellMark = "star" | "dark"

export type StarBattlePuzzle = {
  size: number
  /** Stars owed by every row, every column and every region. */
  quota: number
  /**
   * Which region each square belongs to. Region ids are `0..size - 1`, so there are as many as rows.
   *
   * **This is the board's only clue**, which is what makes the family what it is: where the boundaries run
   * is the whole of what the player is given, and every square is theirs to fill.
   */
  regions: readonly number[]
}

/** What is written on the board, and nothing else — a solver never needs the undo stack. */
export type StarBattleMarks = {
  marks: readonly (CellMark | undefined)[]
}

export type StarBattleState = StarBattleMarks & {
  /** Boards this one replaced, oldest first — the undo stack, the same shape eclipse and futoshiki keep. */
  past: readonly (readonly (CellMark | undefined)[])[]
}

export const cellAt = (size: number, row: number, col: number) => row * size + col

export const rowOf = (size: number, cell: number) => Math.floor(cell / size)
export const colOf = (size: number, cell: number) => cell % size

/** The eight squares a star rules out. Diagonals included, which is the whole of the adjacency rule. */
export const neighboursOf = (size: number, cell: number): number[] => {
  const row = rowOf(size, cell)
  const col = colOf(size, cell)
  return [-1, 0, 1].flatMap(dRow =>
    [-1, 0, 1].flatMap(dCol => {
      if (!dRow && !dCol) return []
      const [atRow, atCol] = [row + dRow, col + dCol]
      const inside = atRow >= 0 && atRow < size && atCol >= 0 && atCol < size
      return inside ? [cellAt(size, atRow, atCol)] : []
    })
  )
}

export const rows = (size: number): number[][] =>
  Array.from({ length: size }, (_unused, row) => Array.from({ length: size }, (_u, col) => cellAt(size, row, col)))

export const cols = (size: number): number[][] =>
  Array.from({ length: size }, (_unused, col) => Array.from({ length: size }, (_u, row) => cellAt(size, row, col)))

export const regionCells = (puzzle: StarBattlePuzzle): number[][] =>
  Array.from({ length: puzzle.size }, (_unused, region) =>
    puzzle.regions.flatMap((at, cell) => (at === region ? [cell] : []))
  )

/**
 * Every group that owes stars: the rows, the columns and the regions.
 *
 * Rows and columns are lines and a region is not, and that difference IS the family (§2 of the design doc) —
 * but the two counting rungs treat all three alike, so they are handed the one list.
 */
export const groupsOf = (puzzle: StarBattlePuzzle): number[][] => [
  ...rows(puzzle.size),
  ...cols(puzzle.size),
  ...regionCells(puzzle),
]

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit — eclipse's number.
const UNDO_LIMIT = 200

export const createStarBattleState = (puzzle: StarBattlePuzzle): StarBattleState => ({
  marks: new Array(puzzle.size * puzzle.size).fill(undefined),
  past: [],
})

/**
 * What a tap does: empty → dark → star → empty.
 *
 * **The elimination comes first, and it is first because it is what the player does.** An 8×8 board is eight
 * stars and fifty-six squares ruled out, so putting the star on the opening tap charges two taps for the
 * common move and one for the rare one — about forty per cent more tapping over a board. This family's
 * reasoning IS elimination (only one rung on the whole ladder ever places a star), and the controls should
 * read the same way round as the reasoning.
 *
 * It also means no conflict is ever shown for a state nobody chose: a broken rule needs a star, and a star is
 * now somewhere the player lands rather than somewhere they pass through.
 *
 * Three states, and unlike eclipse only ONE of them is part of the answer — `dark` is the player's own
 * bookkeeping, and a board that could not record "not here" would make them hold the whole cross-hatch in
 * their head.
 */
export const cycleStarBattleCell = (state: StarBattleState, cell: number): StarBattleState => {
  const next = state.marks[cell] === undefined ? "dark" : state.marks[cell] === "dark" ? "star" : undefined
  return {
    marks: state.marks.map((mark, index) => (index === cell ? next : mark)),
    past: [...state.past, state.marks].slice(-UNDO_LIMIT),
  }
}

/**
 * Rules out a run of squares in one move — what a drag across the board leaves behind.
 *
 * Elimination is what a player spends a board doing (§6), and it comes in runs: the rest of a row, the far
 * end of a region. Tapping each one is the same move over and over, so a drag does the run and this applies
 * it.
 *
 * **Squares already marked are left exactly as they are**, which is the property that makes the gesture safe
 * to make broad: a drag can never take a star back, so nobody has to aim it carefully. And it pushes ONE
 * undo entry, so undo takes back the whole sweep rather than unpicking it a square at a time — a run
 * darkened on a wrong reading is precisely what that button is for.
 */
export const sweepStarBattleCells = (state: StarBattleState, cells: readonly number[]): StarBattleState => {
  const ruling = cells.filter(cell => !state.marks[cell])
  if (!ruling.length) return state
  return {
    marks: state.marks.map((mark, index) => (ruling.includes(index) ? "dark" : mark)),
    past: [...state.past, state.marks].slice(-UNDO_LIMIT),
  }
}

/**
 * Steps the board back one tap.
 *
 * The same button eclipse and futoshiki put under their boards, in the same place and the same shape. What a
 * player wants back here is a run of squares darkened on a wrong reading, which is exactly the mistake a
 * board of mostly-elimination produces — the cycle only gives one square back at a time.
 */
export const undoStarBattle = (state: StarBattleState): StarBattleState => {
  const previous = state.past.at(-1)
  return previous ? { marks: previous, past: state.past.slice(0, -1) } : state
}

export const canUndoStarBattle = (state: StarBattleState): boolean => state.past.length > 0

export const starsIn = (marks: StarBattleMarks["marks"], group: readonly number[]): number[] =>
  group.filter(cell => marks[cell] === "star")

/**
 * Squares a star already standing on the board rules out.
 *
 * **The adjacency rule, rendered rather than written.** Eight neighbours a star is sixty-four squares of
 * pure bookkeeping over an 8×8 board, and none of it is reasoning — the rule says it, and the player can
 * see the star saying it. So the screen shows those squares as spent and the player never spends a tap on
 * them.
 *
 * Deliberately NOT the same thing as marking them: nothing is written, so the marks stay the player's own
 * and taking the star away hands its neighbourhood straight back. A square shown this way still takes a tap,
 * because a player who wants their own mark there is entitled to it.
 */
export const ruledOutByStars = (puzzle: StarBattlePuzzle, marks: StarBattleMarks["marks"]): Set<number> =>
  new Set(
    marks.flatMap((mark, cell) => (mark === "star" ? neighboursOf(puzzle.size, cell) : [])).filter(at => !marks[at])
  )

/** Pairs of stars that touch. Reds the pair, because the broken rule is about two squares. */
const touchingCells = (puzzle: StarBattlePuzzle, marks: StarBattleMarks["marks"]): number[] =>
  marks.flatMap((mark, cell) =>
    mark === "star" && neighboursOf(puzzle.size, cell).some(at => marks[at] === "star") ? [cell] : []
  )

/** Stars in a group that already holds more than it owes. */
const overfilledCells = (puzzle: StarBattlePuzzle, marks: StarBattleMarks["marks"]): number[] =>
  groupsOf(puzzle).flatMap(group => {
    const held = starsIn(marks, group)
    return held.length > puzzle.quota ? held : []
  })

/**
 * Every square the board can already prove wrong.
 *
 * Shown as it happens rather than behind a check button: a broken rule is a fact about the board, and hiding
 * it until the end turns deduction into submit-and-see. A group that is merely UNFINISHED is not a fault —
 * it is what the player is working on.
 */
export const starBattleConflicts = (puzzle: StarBattlePuzzle, state: StarBattleMarks): Set<number> =>
  new Set([...touchingCells(puzzle, state.marks), ...overfilledCells(puzzle, state.marks)])

/**
 * A finished board: every group holds its quota and no two stars touch.
 *
 * Dark marks are not consulted, and empty squares are not a fault. The answer is where the stars are, so a
 * player who never marked a single square dark has still solved it.
 */
export const starBattleSolved = (puzzle: StarBattlePuzzle, state: StarBattleMarks) =>
  groupsOf(puzzle).every(group => starsIn(state.marks, group).length === puzzle.quota) &&
  starBattleConflicts(puzzle, state).size === 0

/**
 * The first mark on the board that contradicts the answer, if any.
 *
 * A hint engine has to check this first: every technique reasons from what the player wrote down, so once
 * one mark is wrong the advice after it leads somewhere dead. **A wrong dark mark counts**, not only a wrong
 * star — darkening the square the answer needs is the mistake this family invites, and it stalls the board
 * just as thoroughly.
 */
export const firstStarBattleMistake = (
  marks: StarBattleMarks["marks"],
  solution: readonly boolean[]
): number | undefined => {
  const wrong = marks.findIndex(
    (mark, cell) => (mark === "star" && !solution[cell]) || (mark === "dark" && solution[cell])
  )
  return wrong === -1 ? undefined : wrong
}
