// The deduction system behind both generation and hints, per docs/game-design/puzzles/futoshiki.md §4.
// Techniques are ordered by how well their reason EXPLAINS itself, not by strength: the last two
// subsume the sign techniques above them, so ranking them first would make every hint "I propagated
// bounds", which teaches nothing. Placements come before eliminations — writing a number in moves the
// board on, while ruling one out is the bookkeeping that gets you there.
export const TECHNIQUES = [
  "nakedSingle",
  "hiddenSingle",
  "signBound",
  "signVsValue",
  "signChain",
  "signPair",
  "nakedPair",
  "hiddenPair",
  "nakedTriple",
  "hiddenTriple",
  "xWing",
] as const

export type TechniqueId = (typeof TECHNIQUES)[number]

export type FutoshikiCellRef = { row: number; col: number }

/** How (row,col) compares to the neighbour in `direction` — the sign drawn in the gap between them. */
export type FutoshikiConstraint = {
  row: number
  col: number
  direction: "right" | "down"
  relation: "<" | ">"
}

export type FutoshikiPuzzleData = {
  size: number
  /** Pre-filled cells; undefined where the player supplies the number. */
  givens: (number | undefined)[][]
  constraints: FutoshikiConstraint[]
}

export type FutoshikiValues = (number | undefined)[][]

/** What the player has pencilled into each cell, in the same shape as the grid. */
export type FutoshikiNotes = number[][][]

export type FutoshikiDecision =
  | { kind: "place"; row: number; col: number; value: number }
  | { kind: "eliminate"; row: number; col: number; values: number[] }

export type FutoshikiStep = {
  technique: TechniqueId
  /** Which reading of the technique fired — each one is a different sentence to the player. */
  variant?: string
  /** The cells the reason talks about, the decided one first. */
  cells: FutoshikiCellRef[]
  /** Index into the puzzle's constraints, for the reasons that point at a sign. */
  constraint?: number
  params: { value?: number; chain?: number; bound?: number; first?: number; second?: number; third?: number }
  decisions: FutoshikiDecision[]
}

/** A board mid-deduction: what is written down, and what is still possible everywhere else. */
export type FutoshikiBoard = {
  size: number
  values: FutoshikiValues
  candidates: Set<number>[][]
}

export const futoshikiCellKey = (row: number, col: number): string => `${row},${col}`

export const constraintNeighbour = (constraint: FutoshikiConstraint): FutoshikiCellRef =>
  constraint.direction === "right"
    ? { row: constraint.row, col: constraint.col + 1 }
    : { row: constraint.row + 1, col: constraint.col }

/** The two cells a sign separates, smaller side first. */
export const constraintEnds = (
  constraint: FutoshikiConstraint
): { lesser: FutoshikiCellRef; greater: FutoshikiCellRef } => {
  const near = { row: constraint.row, col: constraint.col }
  const far = constraintNeighbour(constraint)
  return constraint.relation === "<" ? { lesser: near, greater: far } : { lesser: far, greater: near }
}

const range = (size: number): number[] => Array.from({ length: size }, (_, i) => i + 1)

/**
 * The starting point for every deduction: each empty cell may hold any number its row and column do
 * not already show. The player's own notes narrow that further where they wrote some, so a hint never
 * repeats an elimination they already made. Notes that leave a cell with nothing are ignored rather
 * than trusted — a board is not made undecidable by a slip of the pencil.
 */
export const createFutoshikiBoard = (
  puzzle: FutoshikiPuzzleData,
  values: FutoshikiValues,
  notes?: FutoshikiNotes
): FutoshikiBoard => {
  const { size } = puzzle
  const candidates = values.map((cells, row) =>
    cells.map((value, col) => {
      if (value !== undefined) return new Set<number>()
      const taken = new Set<number>()
      for (let i = 0; i < size; i++) {
        const inRow = values[row][i]
        const inCol = values[i][col]
        if (inRow !== undefined) taken.add(inRow)
        if (inCol !== undefined) taken.add(inCol)
      }
      const open = range(size).filter(candidate => !taken.has(candidate))
      const written = notes?.[row]?.[col]
      const narrowed = written?.length ? open.filter(candidate => written.includes(candidate)) : open
      return new Set(narrowed.length ? narrowed : open)
    })
  )
  return { size, values: values.map(cells => [...cells]), candidates }
}

const applyDecision = (board: FutoshikiBoard, decision: FutoshikiDecision) => {
  if (decision.kind === "eliminate") {
    for (const value of decision.values) board.candidates[decision.row][decision.col].delete(value)
    return
  }
  board.values[decision.row][decision.col] = decision.value
  board.candidates[decision.row][decision.col] = new Set()
  for (let i = 0; i < board.size; i++) {
    board.candidates[decision.row][i].delete(decision.value)
    board.candidates[i][decision.col].delete(decision.value)
  }
}

// A decision found earlier in the same pass can settle a later one; re-checking here is what lets the
// solver apply a whole technique's harvest at once instead of re-scanning after every single cell.
const stillChanges = (board: FutoshikiBoard, decision: FutoshikiDecision): boolean =>
  decision.kind === "place"
    ? board.values[decision.row][decision.col] === undefined
    : decision.values.some(value => board.candidates[decision.row][decision.col].has(value))

type Chain = { length: number; via?: number }
type Chains = { greater: Chain[][]; smaller: Chain[][] }

type Edge = { to: FutoshikiCellRef; constraint: number }

/**
 * How many cells must hold a bigger (resp. smaller) number than each cell, following signs as far as
 * they run. A cell with three cells rising away from it cannot be higher than `size - 3`, which is the
 * bound the two chain techniques below spend.
 */
const buildChains = (puzzle: FutoshikiPuzzleData): Chains => {
  const { size, constraints } = puzzle
  const edges = (): Edge[][][] => Array.from({ length: size }, () => Array.from({ length: size }, () => [] as Edge[]))
  const upward = edges()
  const downward = edges()
  constraints.forEach((constraint, index) => {
    const { lesser, greater } = constraintEnds(constraint)
    upward[lesser.row][lesser.col].push({ to: greater, constraint: index })
    downward[greater.row][greater.col].push({ to: lesser, constraint: index })
  })

  const longest = (graph: Edge[][][]): Chain[][] => {
    const memo: (Chain | undefined)[][] = Array.from({ length: size }, () => new Array(size).fill(undefined))
    const walk = (row: number, col: number): Chain => {
      const cached = memo[row][col]
      if (cached) return cached
      memo[row][col] = { length: 0 }
      const best = graph[row][col].reduce<Chain>(
        (longestSoFar, edge) => {
          const reach = walk(edge.to.row, edge.to.col).length + 1
          return reach > longestSoFar.length ? { length: reach, via: edge.constraint } : longestSoFar
        },
        { length: 0 }
      )
      memo[row][col] = best
      return best
    }
    return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => walk(row, col)))
  }

  return { greater: longest(upward), smaller: longest(downward) }
}

const sameCell = (a: FutoshikiCellRef, b: FutoshikiCellRef): boolean => a.row === b.row && a.col === b.col

const eliminate = (board: FutoshikiBoard, cell: FutoshikiCellRef, values: number[]): FutoshikiDecision[] => {
  const live = values.filter(value => board.candidates[cell.row][cell.col].has(value))
  return live.length ? [{ kind: "eliminate", row: cell.row, col: cell.col, values: live }] : []
}

type Line = { kind: "row" | "col"; index: number; cells: FutoshikiCellRef[] }

const linesOf = (size: number): Line[] => [
  ...Array.from({ length: size }, (_, row) => ({
    kind: "row" as const,
    index: row,
    cells: Array.from({ length: size }, (_, col) => ({ row, col })),
  })),
  ...Array.from({ length: size }, (_, col) => ({
    kind: "col" as const,
    index: col,
    cells: Array.from({ length: size }, (_, row) => ({ row, col })),
  })),
]

type Technique = (puzzle: FutoshikiPuzzleData, board: FutoshikiBoard, chains: Chains) => FutoshikiStep[]

const IMPLEMENTATIONS: Record<TechniqueId, Technique> = {
  // Nothing else fits: the row, the column and the signs have used up every other number.
  nakedSingle: (_puzzle, board) =>
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

  // A number that has nowhere else to go in its row or column, even though this cell could hold others.
  hiddenSingle: (_puzzle, board) =>
    linesOf(board.size).flatMap(line => {
      const placed = new Set(line.cells.map(cell => board.values[cell.row][cell.col]))
      return range(board.size).flatMap(value => {
        if (placed.has(value)) return []
        const hosts = line.cells.filter(cell => board.candidates[cell.row][cell.col].has(value))
        if (hosts.length !== 1) return []
        return [
          {
            technique: "hiddenSingle" as const,
            variant: line.kind,
            cells: [hosts[0]],
            params: { value },
            decisions: [{ kind: "place" as const, row: hosts[0].row, col: hosts[0].col, value }],
          },
        ]
      })
    }),

  // One sign pointing away from a cell already rules out an extreme: something has to be bigger than it.
  signBound: (puzzle, board, chains) =>
    board.values.flatMap((cells, row) =>
      cells.flatMap((value, col) => {
        if (value !== undefined) return []
        const steps: FutoshikiStep[] = []
        const up = chains.greater[row][col]
        const down = chains.smaller[row][col]
        if (up.length === 1) {
          const decisions = eliminate(board, { row, col }, [puzzle.size])
          if (decisions.length)
            steps.push({
              technique: "signBound",
              variant: "high",
              cells: [{ row, col }],
              constraint: up.via,
              params: { value: puzzle.size },
              decisions,
            })
        }
        if (down.length === 1) {
          const decisions = eliminate(board, { row, col }, [1])
          if (decisions.length)
            steps.push({
              technique: "signBound",
              variant: "low",
              cells: [{ row, col }],
              constraint: down.via,
              params: { value: 1 },
              decisions,
            })
        }
        return steps
      })
    ),

  // The neighbour across a sign already holds a number, so this cell's half of the number line is gone.
  signVsValue: (puzzle, board) =>
    puzzle.constraints.flatMap((constraint, index) => {
      const { lesser, greater } = constraintEnds(constraint)
      const lesserValue = board.values[lesser.row][lesser.col]
      const greaterValue = board.values[greater.row][greater.col]
      if (lesserValue !== undefined && greaterValue === undefined) {
        const decisions = eliminate(
          board,
          greater,
          range(puzzle.size).filter(value => value <= lesserValue)
        )
        return decisions.length
          ? [
              {
                technique: "signVsValue" as const,
                variant: "greater",
                cells: [greater, lesser],
                constraint: index,
                params: { value: lesserValue },
                decisions,
              },
            ]
          : []
      }
      if (greaterValue !== undefined && lesserValue === undefined) {
        const decisions = eliminate(
          board,
          lesser,
          range(puzzle.size).filter(value => value >= greaterValue)
        )
        return decisions.length
          ? [
              {
                technique: "signVsValue" as const,
                variant: "less",
                cells: [lesser, greater],
                constraint: index,
                params: { value: greaterValue },
                decisions,
              },
            ]
          : []
      }
      return []
    }),

  // Signs running two or more cells the same way: a whole staircase has to fit above or below this cell.
  signChain: (puzzle, board, chains) =>
    board.values.flatMap((cells, row) =>
      cells.flatMap((value, col) => {
        if (value !== undefined) return []
        const steps: FutoshikiStep[] = []
        const up = chains.greater[row][col]
        const down = chains.smaller[row][col]
        if (up.length >= 2) {
          const bound = puzzle.size - up.length
          const decisions = eliminate(
            board,
            { row, col },
            range(puzzle.size).filter(candidate => candidate > bound)
          )
          if (decisions.length)
            steps.push({
              technique: "signChain",
              variant: "high",
              cells: [{ row, col }],
              constraint: up.via,
              params: { chain: up.length, bound },
              decisions,
            })
        }
        if (down.length >= 2) {
          const bound = 1 + down.length
          const decisions = eliminate(
            board,
            { row, col },
            range(puzzle.size).filter(candidate => candidate < bound)
          )
          if (decisions.length)
            steps.push({
              technique: "signChain",
              variant: "low",
              cells: [{ row, col }],
              constraint: down.via,
              params: { chain: down.length, bound },
              decisions,
            })
        }
        return steps
      })
    ),

  // Neither side of the sign is settled, but what is left on one side still caps the other.
  signPair: (puzzle, board) =>
    puzzle.constraints.flatMap((constraint, index) => {
      const { lesser, greater } = constraintEnds(constraint)
      const lesserOpen = board.candidates[lesser.row][lesser.col]
      const greaterOpen = board.candidates[greater.row][greater.col]
      if (!lesserOpen.size || !greaterOpen.size) return []
      const steps: FutoshikiStep[] = []
      const highest = Math.max(...greaterOpen)
      const lowest = Math.min(...lesserOpen)
      const belowDecisions = eliminate(
        board,
        lesser,
        range(puzzle.size).filter(value => value >= highest)
      )
      if (belowDecisions.length)
        steps.push({
          technique: "signPair",
          variant: "less",
          cells: [lesser, greater],
          constraint: index,
          params: { value: highest },
          decisions: belowDecisions,
        })
      const aboveDecisions = eliminate(
        board,
        greater,
        range(puzzle.size).filter(value => value <= lowest)
      )
      if (aboveDecisions.length)
        steps.push({
          technique: "signPair",
          variant: "greater",
          cells: [greater, lesser],
          constraint: index,
          params: { value: lowest },
          decisions: aboveDecisions,
        })
      return steps
    }),

  // Two numbers with nowhere else in the line to go own the pair of squares that can host them —
  // the mirror of a naked pair, read from the numbers' side instead of the squares'.
  hiddenPair: (_puzzle, board) =>
    linesOf(board.size).flatMap(line => {
      const placed = new Set(line.cells.map(cell => board.values[cell.row][cell.col]))
      const open = range(board.size).filter(value => !placed.has(value))
      const hostsOf = (value: number) => line.cells.filter(cell => board.candidates[cell.row][cell.col].has(value))
      return open.flatMap((first, i) =>
        open.slice(i + 1).flatMap(second => {
          const hosts = hostsOf(first)
          const others = hostsOf(second)
          if (hosts.length !== 2 || others.length !== 2) return []
          if (!hosts.every(cell => others.some(other => sameCell(cell, other)))) return []
          const decisions = hosts.flatMap(cell =>
            eliminate(
              board,
              cell,
              range(board.size).filter(value => value !== first && value !== second)
            )
          )
          if (!decisions.length) return []
          return [
            {
              technique: "hiddenPair" as const,
              variant: line.kind,
              cells: hosts,
              params: { first, second },
              decisions,
            },
          ]
        })
      )
    }),

  // Three squares holding only three numbers between them, however those three fall inside the trio.
  nakedTriple: (_puzzle, board) =>
    linesOf(board.size).flatMap(line => {
      const open = line.cells.filter(cell => {
        const held = board.candidates[cell.row][cell.col].size
        return held >= 2 && held <= 3
      })
      return open.flatMap((first, i) =>
        open.slice(i + 1).flatMap((second, j) =>
          open.slice(i + j + 2).flatMap(third => {
            const trio = [first, second, third]
            const union = new Set(trio.flatMap(cell => [...board.candidates[cell.row][cell.col]]))
            if (union.size !== 3) return []
            const values = [...union].sort((a, b) => a - b)
            const decisions = line.cells
              .filter(cell => !trio.some(held => sameCell(cell, held)))
              .flatMap(cell => eliminate(board, cell, values))
            if (!decisions.length) return []
            return [
              {
                technique: "nakedTriple" as const,
                variant: line.kind,
                cells: trio,
                params: { first: values[0], second: values[1], third: values[2] },
                decisions,
              },
            ]
          })
        )
      )
    }),

  // Three numbers with nowhere else in the line to go, so between them they own three squares.
  hiddenTriple: (_puzzle, board) =>
    linesOf(board.size).flatMap(line => {
      const placed = new Set(line.cells.map(cell => board.values[cell.row][cell.col]))
      const open = range(board.size).filter(value => !placed.has(value))
      const hostsOf = (value: number) => line.cells.filter(cell => board.candidates[cell.row][cell.col].has(value))
      return open.flatMap((first, i) =>
        open.slice(i + 1).flatMap((second, j) =>
          open.slice(i + j + 2).flatMap(third => {
            const values = [first, second, third]
            const hosts = values.map(hostsOf)
            if (hosts.some(found => found.length < 2 || found.length > 3)) return []
            const union = new Map(hosts.flat().map(cell => [futoshikiCellKey(cell.row, cell.col), cell] as const))
            if (union.size !== 3) return []
            const cells = [...union.values()]
            const decisions = cells.flatMap(cell =>
              eliminate(
                board,
                cell,
                range(board.size).filter(value => !values.includes(value))
              )
            )
            if (!decisions.length) return []
            return [
              {
                technique: "hiddenTriple" as const,
                variant: line.kind,
                cells,
                params: { first, second, third },
                decisions,
              },
            ]
          })
        )
      )
    }),

  // A number pinned to the same two lanes in two separate lines: whichever way round it falls, both
  // lanes are spent, so it leaves the rest of them. The one reason here that spans four squares.
  xWing: (_puzzle, board) => {
    const { size } = board
    const steps: FutoshikiStep[] = []
    for (const orientation of ["row", "col"] as const) {
      const at = (line: number, lane: number): FutoshikiCellRef =>
        orientation === "row" ? { row: line, col: lane } : { row: lane, col: line }
      const laneOf = (cell: FutoshikiCellRef) => (orientation === "row" ? cell.col : cell.row)
      for (const value of range(size)) {
        const hosts = Array.from({ length: size }, (_, line) =>
          Array.from({ length: size }, (_, lane) => at(line, lane)).filter(cell =>
            board.candidates[cell.row][cell.col].has(value)
          )
        )
        for (let first = 0; first < size; first++) {
          if (hosts[first].length !== 2) continue
          for (let second = first + 1; second < size; second++) {
            if (hosts[second].length !== 2) continue
            const lanes = hosts[first].map(laneOf)
            const others = hosts[second].map(laneOf)
            if (lanes[0] !== others[0] || lanes[1] !== others[1]) continue
            const decisions = lanes.flatMap(lane =>
              Array.from({ length: size }, (_, line) => line)
                .filter(line => line !== first && line !== second)
                .flatMap(line => eliminate(board, at(line, lane), [value]))
            )
            if (!decisions.length) continue
            steps.push({
              technique: "xWing",
              variant: orientation,
              cells: [...hosts[first], ...hosts[second]],
              params: { value },
              decisions,
            })
          }
        }
      }
    }
    return steps
  },

  // Two cells in a line down to the same two numbers own that pair between them, whichever way round.
  nakedPair: (_puzzle, board) =>
    linesOf(board.size).flatMap(line => {
      const open = line.cells.filter(cell => board.candidates[cell.row][cell.col].size === 2)
      return open.flatMap((first, i) =>
        open.slice(i + 1).flatMap(second => {
          const pair = [...board.candidates[first.row][first.col]].sort((a, b) => a - b)
          const other = [...board.candidates[second.row][second.col]].sort((a, b) => a - b)
          if (pair[0] !== other[0] || pair[1] !== other[1]) return []
          const decisions = line.cells
            .filter(cell => !sameCell(cell, first) && !sameCell(cell, second))
            .flatMap(cell => eliminate(board, cell, pair))
          if (!decisions.length) return []
          return [
            {
              technique: "nakedPair" as const,
              variant: line.kind,
              cells: [first, second],
              params: { first: pair[0], second: pair[1] },
              decisions,
            },
          ]
        })
      )
    }),
}

export const techniqueRank = (id: TechniqueId): number => TECHNIQUES.indexOf(id)

const firstStep = (
  puzzle: FutoshikiPuzzleData,
  board: FutoshikiBoard,
  chains: Chains,
  allowed: readonly TechniqueId[]
): FutoshikiStep | undefined => {
  for (const technique of allowed) {
    const steps = IMPLEMENTATIONS[technique](puzzle, board, chains)
    if (steps.length) return steps[0]
  }
  return undefined
}

/**
 * The cheapest technique that decides something on this board, or undefined when nothing is forced.
 * Which techniques are allowed comes from the board's own tier, so a starter board never explains
 * itself with reasoning it was never built to need.
 *
 * `allowed` is a SET rather than a depth, and has to be: the ladder interleaves the pairs and the
 * triples, so a tier that wants naked subsets without hidden ones is not a prefix of it. It must stay
 * in ladder order, because taking the first technique that fires is what keeps hints cheap.
 */
export const nextFutoshikiStep = (
  puzzle: FutoshikiPuzzleData,
  board: FutoshikiBoard,
  allowed: readonly TechniqueId[] = TECHNIQUES
): FutoshikiStep | undefined => firstStep(puzzle, board, buildChains(puzzle), allowed)

export type FutoshikiSolveResult = {
  values: FutoshikiValues
  /** Every cell decided by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: FutoshikiStep[]
  /** The strongest technique the board actually demanded, undefined for an already-solved board. */
  deepest?: TechniqueId
}

const MAX_PASSES = 2000

/** Carries a board as far as the `allowed` techniques can take it, in place. */
export const applyFutoshikiTechniques = (
  puzzle: FutoshikiPuzzleData,
  board: FutoshikiBoard,
  allowed: readonly TechniqueId[] = TECHNIQUES
): FutoshikiStep[] => {
  const chains = buildChains(puzzle)
  const steps: FutoshikiStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // Short-circuit deliberately: only the cheapest technique that fires is spent, and the dear ones
    // at the end of the ladder are the whole reason. Mapping the ladder and then taking the first
    // non-empty result ran every technique on every pass, x-wing included.
    let harvest: FutoshikiStep[] | undefined
    for (const technique of allowed) {
      const found = IMPLEMENTATIONS[technique](puzzle, board, chains)
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
export const solveFutoshikiByTechniques = (
  puzzle: FutoshikiPuzzleData,
  allowed: readonly TechniqueId[] = TECHNIQUES
): FutoshikiSolveResult => {
  const board = createFutoshikiBoard(puzzle, puzzle.givens)
  const steps = applyFutoshikiTechniques(puzzle, board, allowed)
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

export type FutoshikiMistake = FutoshikiCellRef & { kind: "value" | "note" }

/**
 * The first thing on the board that contradicts the answer, if any. A hint engine must check this
 * first: every technique reasons from what the player wrote down, so once a number or a note is wrong
 * the deductions that follow are advice toward a dead end.
 */
export const firstFutoshikiMistake = (
  values: FutoshikiValues,
  notes: FutoshikiNotes,
  solution: number[][]
): FutoshikiMistake | undefined => {
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
