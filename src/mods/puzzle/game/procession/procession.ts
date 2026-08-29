/**
 * The procession: a day drawn as a track of ticks, and things that happen in it.
 *
 * The rules whole (`docs/game-design/puzzles/procession.md` §2): every bar's LENGTH is given and no bar's
 * START is, the player slides a bar along its own row, and the board is done when every mark between them
 * holds. **There is no illegal placement** — a bar may sit anywhere its row allows and a mark whose
 * condition is broken simply draws as broken, so this family has no fail state and no move history worth
 * keeping: a drag is its own undo.
 */

/** One thing that happens, as its duration. Which row it sits in is its index — one bar to a row. */
export type Bar = { len: number; start: number }

/**
 * What the arrangement has to satisfy. Six kinds, two of which carry a numeral (family doc §2.1).
 *
 * `link` with a zero gap is a handoff — the same mark with a zero on it rather than a seventh kind — and
 * `apart` is the only one that does not say which way round, which is what the upper ladder is made of.
 */
export type Mark =
  | { kind: "pin"; a: number; tick: number }
  | { kind: "link"; a: number; b: number; gap: number }
  | { kind: "before"; a: number; b: number }
  | { kind: "apart"; a: number; b: number }
  | { kind: "together"; a: number; b: number }
  | { kind: "span"; ticks: number }

export type MarkKind = Mark["kind"]

export type ProcessionPuzzle = {
  /** How wide the day is. A bar starts at 0 at the earliest and ends at `ticks` at the latest. */
  ticks: number
  /** Every bar, with the start the board opens on. Index is the row it is drawn in. */
  bars: readonly Bar[]
  marks: readonly Mark[]
}

/** Where every bar stands, in the puzzle's own order. Nothing else about a board changes. */
export type ProcessionState = { readonly starts: readonly number[] }

export const createProcessionState = (puzzle: ProcessionPuzzle): ProcessionState => ({
  starts: puzzle.bars.map(bar => bar.start),
})

/** The last tick a bar may start on, so that it still ends inside the day. */
export const lastStart = (puzzle: ProcessionPuzzle, index: number) => puzzle.ticks - puzzle.bars[index].len

/**
 * A bar moved, clamped into the day.
 *
 * **Clamped rather than refused**, for the reason rush hour clamps a shove: the gesture is a drag, and a
 * drag that runs past the edge should leave the bar against it instead of dropping the whole gesture.
 */
export const slideBar = (puzzle: ProcessionPuzzle, state: ProcessionState, index: number, start: number) => {
  const landed = Math.min(lastStart(puzzle, index), Math.max(0, start))
  if (landed === state.starts[index]) return state
  const starts = [...state.starts]
  starts[index] = landed
  return { starts }
}

const overlaps = (puzzle: ProcessionPuzzle, starts: readonly number[], a: number, b: number) =>
  starts[a] < starts[b] + puzzle.bars[b].len && starts[b] < starts[a] + puzzle.bars[a].len

/** Whether one mark holds for an arrangement. The board's only judgement, and the board's only feedback. */
export const markHolds = (puzzle: ProcessionPuzzle, starts: readonly number[], mark: Mark): boolean => {
  switch (mark.kind) {
    case "pin":
      return starts[mark.a] === mark.tick
    case "link":
      return starts[mark.b] === starts[mark.a] + puzzle.bars[mark.a].len + mark.gap
    case "before":
      return starts[mark.a] + puzzle.bars[mark.a].len <= starts[mark.b]
    case "apart":
      return !overlaps(puzzle, starts, mark.a, mark.b)
    case "together":
      return overlaps(puzzle, starts, mark.a, mark.b)
    case "span": {
      const first = Math.min(...starts)
      const last = Math.max(...starts.map((start, index) => start + puzzle.bars[index].len))
      return last - first === mark.ticks
    }
  }
}

export const processionSolved = (puzzle: ProcessionPuzzle, state: ProcessionState) =>
  puzzle.marks.every(mark => markHolds(puzzle, state.starts, mark))

/** Which marks are broken where the player has put things — what the board draws red. */
export const brokenMarks = (puzzle: ProcessionPuzzle, state: ProcessionState): number[] =>
  puzzle.marks.flatMap((mark, index) => (markHolds(puzzle, state.starts, mark) ? [] : [index]))

/** Which bars a mark is about, so the board can point at them. `span` is about all of them. */
export const barsOf = (puzzle: ProcessionPuzzle, mark: Mark): number[] => {
  if (mark.kind === "span") return puzzle.bars.map((_, index) => index)
  return mark.kind === "pin" ? [mark.a] : [mark.a, mark.b]
}
