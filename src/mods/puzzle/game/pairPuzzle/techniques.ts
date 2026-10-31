import { cols, neighboursOf, orthogonalOf, rows } from "../starBattle/starBattle"
import { pairSolved, type PairMark, type PairPuzzle } from "./pairPuzzle"

// The deduction system behind both generation and hints, ordered by how well each reason explains itself,
// as the star battle ladder is. `claimed` and `lineBlock` reason that a pairing exists, never which one,
// because the answer is the piece positions alone.
export const PAIR_TECHNIQUES = [
  "touch",
  "zeroLine",
  "noAnchor",
  "lineFull",
  "lineTight",
  "onlyWay",
  "claimed",
  "lineBlock",
  "wouldStrand",
] as const

export type PairTechniqueId = (typeof PAIR_TECHNIQUES)[number]

export type PairDecision = { cell: number; mark: PairMark }

export type PairStep = {
  technique: PairTechniqueId
  /** Which reading fired: `row`/`col` for a line, `rowsToCols`/`colsToRows` for a block of rows or columns. */
  variant?: string
  /** How many pieces the reason counts, for the sentences that say a number. */
  count?: number
  /** The squares the reason argues from: the whole line or block a sentence names, so a hint can point at it. */
  cells: number[]
  decisions: PairDecision[]
}

type Marks = (PairMark | undefined)[]

export const pairTechniqueRank = (id: PairTechniqueId): number => PAIR_TECHNIQUES.indexOf(id)

export const pairTechniquesUpTo = (cap: PairTechniqueId): PairTechniqueId[] =>
  PAIR_TECHNIQUES.filter(id => pairTechniqueRank(id) <= pairTechniqueRank(cap))

const isFree = (puzzle: PairPuzzle, marks: Marks, cell: number) => !marks[cell] && !puzzle.anchors[cell]

const freeIn = (puzzle: PairPuzzle, marks: Marks, cells: readonly number[]) =>
  cells.filter(cell => isFree(puzzle, marks, cell))

const piecesIn = (marks: Marks, cells: readonly number[]) => cells.filter(cell => marks[cell] === "piece").length

const anchorsBeside = (puzzle: PairPuzzle, cell: number) =>
  orthogonalOf(puzzle.size, cell).filter(at => puzzle.anchors[at])

/** A square that could still be an anchor's piece: open, or a piece already. */
const usable = (puzzle: PairPuzzle, marks: Marks, cell: number) => !puzzle.anchors[cell] && marks[cell] !== "empty"

const empty = (cells: readonly number[]): PairDecision[] => cells.map(cell => ({ cell, mark: "empty" }))
const place = (cells: readonly number[]): PairDecision[] => cells.map(cell => ({ cell, mark: "piece" }))

const allApart = (size: number, cells: readonly number[]) =>
  !cells.some(cell => neighboursOf(size, cell).some(at => cells.includes(at)))

const lines = (puzzle: PairPuzzle) => [
  ...rows(puzzle.size).map((cells, at) => ({ kind: "row", cells, count: puzzle.rowCounts[at] })),
  ...cols(puzzle.size).map((cells, at) => ({ kind: "col", cells, count: puzzle.colCounts[at] })),
]

/** A piece rules out everything it touches — the spent squares the board already draws. */
const touchSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] =>
  marks.flatMap((mark, cell) => {
    if (mark !== "piece") return []
    const ruled = freeIn(puzzle, marks, neighboursOf(puzzle.size, cell))
    return ruled.length ? [{ technique: "touch" as const, cells: [cell], decisions: empty(ruled) }] : []
  })

/** A line counted zero holds no piece anywhere. */
const zeroLineSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] =>
  lines(puzzle).flatMap(({ kind, cells, count }) => {
    const spare = freeIn(puzzle, marks, cells)
    return count === 0 && spare.length
      ? [{ technique: "zeroLine" as const, variant: kind, count, cells, decisions: empty(spare) }]
      : []
  })

/** Squares with no anchor up, down, left or right of them can never hold a piece; one step takes them all. */
const noAnchorSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] => {
  const lonely = puzzle.anchors.flatMap((_anchor, cell) =>
    isFree(puzzle, marks, cell) && !anchorsBeside(puzzle, cell).length ? [cell] : []
  )
  return lonely.length ? [{ technique: "noAnchor", cells: lonely, decisions: empty(lonely) }] : []
}

/** A line holding its count has nothing left to give. */
const lineFullSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] =>
  lines(puzzle).flatMap(({ kind, cells, count }) => {
    const spare = freeIn(puzzle, marks, cells)
    return count > 0 && piecesIn(marks, cells) === count && spare.length
      ? [{ technique: "lineFull" as const, variant: kind, count, cells, decisions: empty(spare) }]
      : []
  })

/** A line down to as many open squares as it still owes: all of them are pieces. */
const lineTightSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] =>
  lines(puzzle).flatMap(({ kind, cells, count }) => {
    const owed = count - piecesIn(marks, cells)
    const free = freeIn(puzzle, marks, cells)
    // Touching squares mean the board is already broken; the hint engine reports the wrong mark instead.
    if (owed <= 0 || free.length !== owed || !allApart(puzzle.size, free)) return []
    return [{ technique: "lineTight" as const, variant: kind, count: owed, cells, decisions: place(free) }]
  })

/** An anchor with one usable square beside it takes its piece there. */
const onlyWaySteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] =>
  puzzle.anchors.flatMap((anchor, cell) => {
    if (!anchor) return []
    const around = orthogonalOf(puzzle.size, cell)
    const options = around.filter(at => usable(puzzle, marks, at))
    if (options.length !== 1 || marks[options[0]]) return []
    return [{ technique: "onlyWay" as const, cells: [cell, ...around], decisions: place(options) }]
  })

/**
 * The anchors whose piece is already on the board, each with that piece.
 *
 * A piece with one anchor beside it belongs to that anchor in every answer; a piece whose other anchors
 * are all owned that way belongs to the one left. Nothing here picks between two possible owners.
 */
const ownedAnchors = (puzzle: PairPuzzle, marks: Marks): Map<number, number> => {
  const owner = new Map<number, number>()
  const pieces = marks.flatMap((mark, cell) => (mark === "piece" ? [cell] : []))
  for (let changed = true; changed;) {
    changed = false
    for (const piece of pieces) {
      if ([...owner.values()].includes(piece)) continue
      const left = anchorsBeside(puzzle, piece).filter(anchor => !owner.has(anchor))
      if (left.length !== 1) continue
      owner.set(left[0], piece)
      changed = true
    }
  }
  return owner
}

/**
 * A square whose every neighbouring anchor already has its piece is ruled out, one step per owned anchor:
 * the squares beside it that no other free anchor could still use.
 */
const claimedSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] => {
  const owner = ownedAnchors(puzzle, marks)
  return [...owner].flatMap(([anchor, piece]) => {
    const spent = orthogonalOf(puzzle.size, anchor).filter(
      cell => isFree(puzzle, marks, cell) && anchorsBeside(puzzle, cell).every(other => owner.has(other))
    )
    return spent.length ? [{ technique: "claimed" as const, cells: [anchor, piece], decisions: empty(spent) }] : []
  })
}

/**
 * A run of adjacent lines counting more pieces than it holds anchors: the surplus pairs with anchors just
 * outside the run. Each outside anchor reaches into the run through one door square; when the usable door
 * squares are exactly as many as the surplus, every one of them holds a piece.
 *
 * Sound because every piece in the run pairs with an anchor inside it or orthogonally beside it, and an
 * anchor outside the run touches it through one square only.
 */
const lineBlockSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] => {
  const { size } = puzzle
  const sweep = (lineCells: number[][], counts: readonly number[], variant: string): PairStep[] => {
    const steps: PairStep[] = []
    for (let from = 0; from < size; from++)
      for (let to = from; to < size; to++) {
        const block = lineCells.slice(from, to + 1).flat()
        const total = counts.slice(from, to + 1).reduce((sum, n) => sum + n, 0)
        const surplus = total - block.filter(cell => puzzle.anchors[cell]).length
        if (surplus <= 0) continue
        const edges: [number[] | undefined, number[]][] = [
          [lineCells[from - 1], lineCells[from]],
          [lineCells[to + 1], lineCells[to]],
        ]
        // A square two outside anchors share still holds one piece, so it counts once.
        const doors = new Set(
          edges.flatMap(([outside, inside]) =>
            (outside ?? []).flatMap((cell, at) =>
              puzzle.anchors[cell] && usable(puzzle, marks, inside[at]) ? [inside[at]] : []
            )
          )
        )
        const live = [...doors].filter(cell => !marks[cell])
        if (doors.size !== surplus || !live.length) continue
        steps.push({ technique: "lineBlock", variant, count: surplus, cells: block, decisions: place(live) })
      }
    return steps
  }
  return [...sweep(rows(size), puzzle.rowCounts, "rowsToCols"), ...sweep(cols(size), puzzle.colCounts, "colsToRows")]
}

/**
 * A square where a piece would leave some line or anchor with nowhere to go.
 *
 * A hypothesis about one square, refuted by one line or anchor the player can look at. Only the piece's
 * necessary consequences are followed: the squares it touches, and the rest of any line it fills.
 */
const wouldStrandSteps = (puzzle: PairPuzzle, marks: Marks): PairStep[] => {
  const all = lines(puzzle)
  const anchors = puzzle.anchors.flatMap((anchor, cell) => (anchor ? [cell] : []))
  for (const [cell] of marks.entries()) {
    if (!isFree(puzzle, marks, cell)) continue
    const trial: Marks = [...marks]
    trial[cell] = "piece"
    for (const at of neighboursOf(puzzle.size, cell)) if (isFree(puzzle, trial, at)) trial[at] = "empty"
    for (const { cells, count } of all)
      if (cells.includes(cell) && piecesIn(trial, cells) === count)
        for (const at of cells) if (isFree(puzzle, trial, at)) trial[at] = "empty"
    const stranded = all.find(({ cells, count }) => {
      const owed = count - piecesIn(trial, cells)
      return owed > 0 && freeIn(puzzle, trial, cells).length < owed
    })
    if (stranded)
      return [
        {
          technique: "wouldStrand" as const,
          variant: stranded.kind,
          count: stranded.count - piecesIn(marks, stranded.cells),
          cells: stranded.cells,
          decisions: empty([cell]),
        },
      ]
    const lonely = anchors.find(anchor => !orthogonalOf(puzzle.size, anchor).some(at => usable(puzzle, trial, at)))
    if (lonely !== undefined)
      return [
        {
          technique: "wouldStrand" as const,
          variant: "anchor",
          cells: [lonely, ...orthogonalOf(puzzle.size, lonely)],
          decisions: empty([cell]),
        },
      ]
  }
  return []
}

const IMPLEMENTATIONS: Record<PairTechniqueId, (puzzle: PairPuzzle, marks: Marks) => PairStep[]> = {
  touch: touchSteps,
  zeroLine: zeroLineSteps,
  noAnchor: noAnchorSteps,
  lineFull: lineFullSteps,
  lineTight: lineTightSteps,
  onlyWay: onlyWaySteps,
  claimed: claimedSteps,
  lineBlock: lineBlockSteps,
  wouldStrand: wouldStrandSteps,
}

/** The cheapest technique that decides something, or undefined when nothing is forced. */
export const nextPairStep = (
  puzzle: PairPuzzle,
  marks: Marks,
  allowed: readonly PairTechniqueId[] = PAIR_TECHNIQUES
): PairStep | undefined => {
  for (const technique of allowed) {
    const [step] = IMPLEMENTATIONS[technique](puzzle, marks)
    if (step) return step
  }
  return undefined
}

const MAX_PASSES = 4000

/** Carries a board as far as the `allowed` techniques take it, writing into `marks`. */
export const applyPairTechniques = (
  puzzle: PairPuzzle,
  marks: Marks,
  allowed: readonly PairTechniqueId[] = PAIR_TECHNIQUES
): PairStep[] => {
  const steps: PairStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const step = nextPairStep(puzzle, marks, allowed)
    if (!step) break
    const live = step.decisions.filter(decision => !marks[decision.cell])
    if (!live.length) break
    for (const decision of live) marks[decision.cell] = decision.mark
    steps.push({ ...step, decisions: live })
  }
  return steps
}

export type PairSolveResult = {
  marks: Marks
  /** Every square reached by deduction alone, and the board finished. */
  settled: boolean
  steps: PairStep[]
  /** The strongest technique the board actually demanded. */
  deepest?: PairTechniqueId
}

export const solvePairByTechniques = (
  puzzle: PairPuzzle,
  allowed: readonly PairTechniqueId[] = PAIR_TECHNIQUES
): PairSolveResult => {
  const marks: Marks = new Array(puzzle.size * puzzle.size).fill(undefined)
  const steps = applyPairTechniques(puzzle, marks, allowed)
  return {
    marks,
    settled: marks.every((mark, cell) => mark !== undefined || puzzle.anchors[cell]) && pairSolved(puzzle, { marks }),
    steps,
    deepest: steps.reduce<PairTechniqueId | undefined>(
      (deepest, step) =>
        !deepest || pairTechniqueRank(step.technique) > pairTechniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}

/** Which square a step is about, for a board that draws the conclusion apart from its evidence. */
export const pairStepFocus = (step: PairStep) => step.decisions[0]?.cell ?? step.cells[0]
