import {
  cols,
  groupsOf,
  neighboursOf,
  regionCells,
  rows,
  starsIn,
  type CellMark,
  type StarBattlePuzzle,
} from "./starBattle"

// The deduction system behind both generation and hints, per docs/game-design/puzzles/star-battle.md §3.
// Ordered by how well each reason EXPLAINS itself rather than by how much it decides — the rule every
// family doc here holds its ladder to.
export const STAR_BATTLE_TECHNIQUES = [
  "touch",
  "groupFull",
  "groupTight",
  "regionLine",
  "lineRegion",
  "spanning",
] as const

export type StarBattleTechniqueId = (typeof STAR_BATTLE_TECHNIQUES)[number]

/**
 * **This family's two orders coincide, and that is worth stating rather than encoding twice.**
 *
 * Eclipse keeps a second list because its strength ladder and its spot-it-first order genuinely disagree —
 * a line that already holds all of one mark decides more than a sign does but is seen later. Here the
 * ladder already runs from the reason a player cannot miss (a star with open squares around it) to the one
 * they have to hunt for (two regions filling two rows), so a hint reads it in the same direction. A copy
 * of the list would be a second thing to keep in step for no gain.
 */
export type StarBattleDecision = { cell: number; mark: CellMark }

export type StarBattleStep = {
  technique: StarBattleTechniqueId
  /** Which reading fired — a row, a column and a region are three different sentences. */
  variant?: string
  /** How many stars the reason counts, for the sentences that say a number. */
  count?: number
  /** The squares the reason argues FROM — its evidence, never the squares it decides. */
  cells: number[]
  decisions: StarBattleDecision[]
}

export type Marks = (CellMark | undefined)[]

export const techniqueRank = (id: StarBattleTechniqueId): number => STAR_BATTLE_TECHNIQUES.indexOf(id)

/** A square that could still take a star: not blocked, and nothing written in it yet. */
const isOpen = (puzzle: StarBattlePuzzle, marks: Marks, cell: number) => !puzzle.blocked[cell] && !marks[cell]

const freeIn = (puzzle: StarBattlePuzzle, marks: Marks, group: readonly number[]) =>
  group.filter(cell => isOpen(puzzle, marks, cell))

const owedBy = (puzzle: StarBattlePuzzle, marks: Marks, group: readonly number[]) =>
  puzzle.quota - starsIn(marks, group).length

/** Whether a set of squares could hold a star each — no two of them may touch. */
const allApart = (size: number, cells: readonly number[]) =>
  !cells.some(cell => neighboursOf(size, cell).some(at => cells.includes(at)))

const darken = (cells: readonly number[]): StarBattleDecision[] => cells.map(cell => ({ cell, mark: "dark" }))

/**
 * The groups a counting rung reads, each with the word its sentence uses.
 *
 * A row, a column and a region count identically and read differently — "this row has its star" and "this
 * region has its star" point at different things on the board, so the variant travels with the step.
 */
const countingGroups = (puzzle: StarBattlePuzzle): { kind: string; cells: number[] }[] => [
  ...rows(puzzle.size).map(cells => ({ kind: "row", cells })),
  ...cols(puzzle.size).map(cells => ({ kind: "col", cells })),
  ...regionCells(puzzle).map(cells => ({ kind: "region", cells })),
]

/**
 * A star rules out everything it touches.
 *
 * A rung so the board has something to say on a player's first move, and so the screen can dim the
 * neighbourhood as the star lands — not because anyone has to work it out.
 */
const touchSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] =>
  marks.flatMap((mark, cell) => {
    if (mark !== "star") return []
    const ruled = neighboursOf(puzzle.size, cell).filter(at => isOpen(puzzle, marks, at))
    return ruled.length ? [{ technique: "touch" as const, cells: [cell], decisions: darken(ruled) }] : []
  })

/** A group with its stars already in it has nothing left to give. */
const groupFullSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] =>
  countingGroups(puzzle).flatMap(({ kind, cells }) => {
    if (owedBy(puzzle, marks, cells) !== 0) return []
    const spare = freeIn(puzzle, marks, cells)
    return spare.length
      ? [
          {
            technique: "groupFull" as const,
            variant: kind,
            count: puzzle.quota,
            cells: starsIn(marks, cells),
            decisions: darken(spare),
          },
        ]
      : []
  })

/** A group down to as many squares as it owes stars: all of them are stars. */
const groupTightSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] =>
  countingGroups(puzzle).flatMap(({ kind, cells }) => {
    const owed = owedBy(puzzle, marks, cells)
    const free = freeIn(puzzle, marks, cells)
    if (owed <= 0 || free.length !== owed) return []
    // A board where those squares touch is a board already broken, and the move it would advise breaks the
    // adjacency rule out loud. Say nothing instead: the hint engine reports the wrong mark behind it first.
    if (!allApart(puzzle.size, free)) return []
    return [
      {
        technique: "groupTight" as const,
        variant: kind,
        count: owed,
        cells: free,
        decisions: free.map(cell => ({ cell, mark: "star" as const })),
      },
    ]
  })

/** Rows and columns, each with the word its sentence uses. Never mixed — see `spanningSteps`. */
const lineKinds = (puzzle: StarBattlePuzzle) => [
  { kind: "row", lines: rows(puzzle.size) },
  { kind: "col", lines: cols(puzzle.size) },
]

/**
 * A region squeezed into one line spends that line's quota.
 *
 * The first of the two rungs that need a region boundary to mean anything, and the family's own reasoning
 * (design doc §3): the region's stars have to come out of the line, and the line owes exactly that many, so
 * the rest of the line holds none.
 */
const regionLineSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] =>
  regionCells(puzzle).flatMap(region => {
    const inside = freeIn(puzzle, marks, region)
    const owed = owedBy(puzzle, marks, region)
    if (!inside.length || owed <= 0) return []
    return lineKinds(puzzle).flatMap(({ kind, lines }) =>
      lines.flatMap(line => {
        if (inside.some(cell => !line.includes(cell))) return []
        if (owedBy(puzzle, marks, line) !== owed) return []
        const elsewhere = freeIn(puzzle, marks, line).filter(cell => !inside.includes(cell))
        return elsewhere.length
          ? [
              {
                technique: "regionLine" as const,
                variant: kind,
                count: owed,
                cells: inside,
                decisions: darken(elsewhere),
              },
            ]
          : []
      })
    )
  })

/**
 * A line squeezed into one region spends that region's quota — the converse reading.
 *
 * Not the mirror image in practice: this one needs the rest of the line already dark, so it arrives later in
 * a solve than the region-into-line reading does.
 */
const lineRegionSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] =>
  lineKinds(puzzle).flatMap(({ kind, lines }) =>
    lines.flatMap(line => {
      const inside = freeIn(puzzle, marks, line)
      const owed = owedBy(puzzle, marks, line)
      if (!inside.length || owed <= 0) return []
      return regionCells(puzzle).flatMap(region => {
        if (inside.some(cell => !region.includes(cell))) return []
        if (owedBy(puzzle, marks, region) !== owed) return []
        const elsewhere = freeIn(puzzle, marks, region).filter(cell => !inside.includes(cell))
        return elsewhere.length
          ? [
              {
                technique: "lineRegion" as const,
                variant: kind,
                count: owed,
                cells: inside,
                decisions: darken(elsewhere),
              },
            ]
          : []
      })
    })
  )

const pairsOf = <T>(items: T[]): [T, T][] =>
  items.flatMap((first, index) => items.slice(index + 1).map((second): [T, T] => [first, second]))

/**
 * Two groups whose free squares fit inside two groups of the other kind, quotas agreeing.
 *
 * The top rung, and the generalisation of the two above from one group to two. **Rows and columns are swept
 * separately, never together** — a cover built from both is the unsoundness the design doc's §3.3 records,
 * because every square belongs to a row AND a column, so a mixed cover counts each star twice and the quota
 * arithmetic silently agrees on boards it has no business deciding.
 *
 * Two is where it stops: a three-group span is a sentence that no longer fits a phone-width banner, which is
 * the constraint the ladder is built to.
 */
const spanningSteps = (puzzle: StarBattlePuzzle, marks: Marks): StarBattleStep[] => {
  const owed = (group: readonly number[]) => owedBy(puzzle, marks, group)
  const free = (group: readonly number[]) => freeIn(puzzle, marks, group)
  const sweep = (from: number[][], into: number[][], variant: string): StarBattleStep[] =>
    pairsOf(from).flatMap(pair => {
      const inside = pair.flatMap(free)
      const owes = pair.reduce((total, group) => total + owed(group), 0)
      if (!inside.length || owes <= 0) return []
      const cover = into.filter(group => free(group).some(cell => inside.includes(cell)))
      if (cover.length !== pair.length) return []
      if (cover.reduce((total, group) => total + owed(group), 0) !== owes) return []
      const elsewhere = cover.flatMap(free).filter(cell => !inside.includes(cell))
      return elsewhere.length
        ? [{ technique: "spanning" as const, variant, count: owes, cells: inside, decisions: darken(elsewhere) }]
        : []
    })
  const regions = regionCells(puzzle)
  return [
    ...sweep(regions, rows(puzzle.size), "toRows"),
    ...sweep(regions, cols(puzzle.size), "toCols"),
    ...sweep(rows(puzzle.size), regions, "fromRows"),
    ...sweep(cols(puzzle.size), regions, "fromCols"),
  ]
}

const IMPLEMENTATIONS: Record<StarBattleTechniqueId, (puzzle: StarBattlePuzzle, marks: Marks) => StarBattleStep[]> = {
  touch: touchSteps,
  groupFull: groupFullSteps,
  groupTight: groupTightSteps,
  regionLine: regionLineSteps,
  lineRegion: lineRegionSteps,
  spanning: spanningSteps,
}

/**
 * The cheapest technique that decides something, or undefined when nothing is forced.
 *
 * `allowed` is the board's own tier, so a starter board never explains itself with reasoning it was never
 * built to need.
 */
export const nextStarBattleStep = (
  puzzle: StarBattlePuzzle,
  marks: Marks,
  allowed: readonly StarBattleTechniqueId[] = STAR_BATTLE_TECHNIQUES
): StarBattleStep | undefined => {
  for (const technique of allowed) {
    const [step] = IMPLEMENTATIONS[technique](puzzle, marks)
    if (step) return step
  }
  return undefined
}

const MAX_PASSES = 4000

/** Carries a board as far as the `allowed` techniques take it, writing into `marks`. */
export const applyStarBattleTechniques = (
  puzzle: StarBattlePuzzle,
  marks: Marks,
  allowed: readonly StarBattleTechniqueId[] = STAR_BATTLE_TECHNIQUES
): StarBattleStep[] => {
  const steps: StarBattleStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const step = nextStarBattleStep(puzzle, marks, allowed)
    if (!step) break
    const live = step.decisions.filter(decision => !marks[decision.cell])
    if (!live.length) break
    for (const decision of live) marks[decision.cell] = decision.mark
    steps.push({ ...step, decisions: live })
  }
  return steps
}

export type StarBattleSolveResult = {
  marks: Marks
  /** Every square reached by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: StarBattleStep[]
  /** The strongest technique the board actually demanded. */
  deepest?: StarBattleTechniqueId
}

/** Where the stars are, as a mask — the shape generation and the hint engine both compare against. */
export const starMask = (marks: Marks): boolean[] => marks.map(mark => mark === "star")

export const solveStarBattleByTechniques = (
  puzzle: StarBattlePuzzle,
  allowed: readonly StarBattleTechniqueId[] = STAR_BATTLE_TECHNIQUES
): StarBattleSolveResult => {
  const marks: Marks = puzzle.blocked.map(blocked => (blocked ? "dark" : undefined))
  const steps = applyStarBattleTechniques(puzzle, marks, allowed)
  const groups = groupsOf(puzzle)
  return {
    marks,
    settled: marks.every(mark => mark !== undefined) && groups.every(g => starsIn(marks, g).length === puzzle.quota),
    steps,
    deepest: steps.reduce<StarBattleTechniqueId | undefined>(
      (deepest, step) =>
        !deepest || techniqueRank(step.technique) > techniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}

/** Which square a step is ABOUT, for a board that has to draw the conclusion apart from its evidence. */
export const stepFocus = (step: StarBattleStep) => step.decisions[0]?.cell ?? step.cells[0]
