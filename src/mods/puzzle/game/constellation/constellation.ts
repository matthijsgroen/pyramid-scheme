/**
 * The constellation board: stars carrying a number, joined by lines of light
 * (docs/game-design/puzzles/constellation.md).
 *
 * Two index spaces, and keeping them apart is what keeps the rest of the family short. A **cell** is a
 * position on the grid, `row * size + col`, and only the board's geometry speaks in cells. A **star** is an
 * index into `stars`, and a **pair** an index into `pairs` — the numbers the player reasons about and the
 * solver decides. Nothing here is nested: every rule reads either one star's pairs or one pair's crossings,
 * and both are flat lookups built once with the board.
 */

/** A star and the number of lines that must meet it. */
export type Star = { cell: number; count: number }

/** A candidate line: two stars facing each other along a row or column with clear sky between them. */
export type Pair = { a: number; b: number }

export type ConstellationPuzzle = {
  /** Cells per side. */
  size: number
  stars: readonly Star[]
  /**
   * Every line the board could hold, and the only lines it can.
   *
   * A line stops at the first star it reaches, so a pair is always the NEAREST two stars along a row or
   * column — anything further is not a line the rules allow, which is why the list is geometry rather than
   * a state. Built once with the board: the solver resolves a deduction into a pair index, and a drag
   * resolves a direction into the same.
   */
  pairs: readonly Pair[]
}

/** How many lines are drawn on each pair — 0, 1 or 2, by pair index. */
export type ConstellationLines = { lines: readonly number[] }

export type ConstellationState = ConstellationLines & {
  /** Boards this one replaced, oldest first — the undo stack, the same shape eclipse and futoshiki keep. */
  past: readonly (readonly number[])[]
}

export const MAX_LINES = 2

export const rowOf = (size: number, cell: number) => Math.floor(cell / size)
export const colOf = (size: number, cell: number) => cell % size

/** Pair indices touching each star, by star index. Every counting rung reads exactly this. */
export const pairsByStar = (puzzle: ConstellationPuzzle): number[][] => {
  const byStar: number[][] = puzzle.stars.map(() => [])
  puzzle.pairs.forEach((pair, index) => {
    byStar[pair.a].push(index)
    byStar[pair.b].push(index)
  })
  return byStar
}

const isHorizontal = (puzzle: ConstellationPuzzle, pair: Pair) =>
  rowOf(puzzle.size, puzzle.stars[pair.a].cell) === rowOf(puzzle.size, puzzle.stars[pair.b].cell)

/** The span a pair's line occupies, as `[fixed, from, to]` on its own axis, `from < to`. */
const spanOf = (puzzle: ConstellationPuzzle, pair: Pair): [number, number, number] => {
  const { size } = puzzle
  const [a, b] = [puzzle.stars[pair.a].cell, puzzle.stars[pair.b].cell]
  return isHorizontal(puzzle, pair)
    ? [rowOf(size, a), Math.min(colOf(size, a), colOf(size, b)), Math.max(colOf(size, a), colOf(size, b))]
    : [colOf(size, a), Math.min(rowOf(size, a), rowOf(size, b)), Math.max(rowOf(size, a), rowOf(size, b))]
}

/**
 * Pair indices whose line would cross each pair's, by pair index.
 *
 * Strictly between on both axes: a pair runs between the nearest two stars, so nothing else's endpoint can
 * sit inside it, and two lines sharing a star meet there rather than cross.
 */
export const crossingsByPair = (puzzle: ConstellationPuzzle): number[][] =>
  puzzle.pairs.map((pair, index) => {
    const horizontal = isHorizontal(puzzle, pair)
    const [line, from, to] = spanOf(puzzle, pair)
    return puzzle.pairs.flatMap((other, otherIndex) => {
      if (otherIndex === index || isHorizontal(puzzle, other) === horizontal) return []
      const [otherLine, otherFrom, otherTo] = spanOf(puzzle, other)
      const crosses = otherLine > from && otherLine < to && line > otherFrom && line < otherTo
      return crosses ? [otherIndex] : []
    })
  })

/** Every candidate line on a sky: for each star, the nearest star to its right and the nearest below. */
export const pairsOf = (size: number, stars: readonly Star[]): Pair[] => {
  const starAt = new Map(stars.map((star, index) => [star.cell, index]))
  const nearest = (from: Star, step: number, sameLine: (cell: number) => boolean): number | undefined => {
    for (let cell = from.cell + step; cell >= 0 && cell < size * size && sameLine(cell); cell += step) {
      const found = starAt.get(cell)
      if (found !== undefined) return found
    }
    return undefined
  }
  return stars.flatMap((star, index) => {
    const row = rowOf(size, star.cell)
    const right = nearest(star, 1, cell => rowOf(size, cell) === row)
    const down = nearest(star, size, () => true)
    return [right, down].flatMap(other => (other === undefined ? [] : [{ a: index, b: other }]))
  })
}

/**
 * The pair leaving a star in a direction, if the rules allow one there.
 *
 * What a drag decides is a **direction**, not a destination: the line then runs to whichever star lies that
 * way, however far past the finger it is (docs/game-design/puzzles/constellation.md §6). So the gesture only
 * ever has to be resolved this far, and a flick toward empty sky resolves to nothing.
 */
export const pairTowards = (
  puzzle: ConstellationPuzzle,
  star: number,
  deltaRow: number,
  deltaCol: number
): number | undefined => {
  const { size } = puzzle
  const from = puzzle.stars[star].cell
  const found = pairsByStar(puzzle)[star].find(pair => {
    const { a, b } = puzzle.pairs[pair]
    const to = puzzle.stars[a === star ? b : a].cell
    return (
      Math.sign(rowOf(size, to) - rowOf(size, from)) === deltaRow &&
      Math.sign(colOf(size, to) - colOf(size, from)) === deltaCol
    )
  })
  return found
}

// Deep enough that no session reaches it, bounded so a long one cannot grow without limit.
const UNDO_LIMIT = 200

export const createConstellationState = (puzzle: ConstellationPuzzle): ConstellationState => ({
  lines: puzzle.pairs.map(() => 0),
  past: [],
})

/** How many lines currently meet a star. */
export const degreeOf = (byStar: number[][], lines: ConstellationLines["lines"], star: number): number =>
  byStar[star].reduce((total, pair) => total + lines[pair], 0)

/**
 * What a drag does: none → single → double → none.
 *
 * A crossing is **refused rather than drawn**: the rules do not allow it, so it is a state the player never
 * chose, and the candidate line under their finger already said so before they let go. What the board does
 * show is the mistake they did choose — a star with more lines than its number (`overfilledStars`).
 */
export const cycleConstellationLine = (
  puzzle: ConstellationPuzzle,
  state: ConstellationState,
  pair: number
): ConstellationState => {
  const next = (state.lines[pair] + 1) % (MAX_LINES + 1)
  if (next === 1 && crossingsByPair(puzzle)[pair].some(other => state.lines[other] > 0)) return state
  return {
    lines: state.lines.map((count, index) => (index === pair ? next : count)),
    past: [...state.past, state.lines].slice(-UNDO_LIMIT),
  }
}

export const undoConstellation = (state: ConstellationState): ConstellationState => {
  const previous = state.past.at(-1)
  return previous ? { lines: previous, past: state.past.slice(0, -1) } : state
}

export const canUndoConstellation = (state: ConstellationState): boolean => state.past.length > 0

/** Stars holding more lines than their number, which no answer can. */
export const overfilledStars = (puzzle: ConstellationPuzzle, state: ConstellationLines): Set<number> => {
  const byStar = pairsByStar(puzzle)
  return new Set(
    puzzle.stars.flatMap((star, index) => (degreeOf(byStar, state.lines, index) > star.count ? [index] : []))
  )
}

/**
 * The stars reachable from the first one along the lines drawn.
 *
 * The connectivity rule is the only rule about the whole board, and this is all it takes to read: a sky
 * that falls into two constellations is one this set does not cover.
 */
export const reachedStars = (puzzle: ConstellationPuzzle, state: ConstellationLines): Set<number> => {
  const byStar = pairsByStar(puzzle)
  const seen = new Set<number>(puzzle.stars.length ? [0] : [])
  const queue = [...seen]
  while (queue.length) {
    const star = queue.shift()!
    for (const pair of byStar[star]) {
      if (state.lines[pair] === 0) continue
      const { a, b } = puzzle.pairs[pair]
      for (const next of [a, b])
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
    }
  }
  return seen
}

export const constellationSolved = (puzzle: ConstellationPuzzle, state: ConstellationLines): boolean => {
  const byStar = pairsByStar(puzzle)
  return (
    puzzle.stars.every((star, index) => degreeOf(byStar, state.lines, index) === star.count) &&
    reachedStars(puzzle, state).size === puzzle.stars.length
  )
}

/**
 * The first line on the board that the answer disagrees with, if any.
 *
 * A hint engine has to check this first: every technique reasons from what the player has drawn, so once one
 * line is wrong the advice after it leads somewhere dead.
 */
export const firstConstellationMistake = (
  lines: ConstellationLines["lines"],
  solution: readonly number[]
): number | undefined => {
  const wrong = lines.findIndex((count, pair) => count > solution[pair])
  return wrong === -1 ? undefined : wrong
}
