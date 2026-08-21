import { brokenLinks, lines, other, type EclipsePuzzle, type Link, type Mark } from "./eclipse"

// The deduction system behind both generation and hints, per docs/game-design/puzzles/eclipse.md §4.
// Ordered by how well each reason EXPLAINS itself rather than by how much it decides: a sign next to a
// filled cell is a sentence the player can repeat back, and "assume the other mark and watch it break"
// is the last resort precisely because it explains nothing about the board.
export const ECLIPSE_TECHNIQUES = [
  "sign",
  "noTriple",
  "signPair",
  "lineCount",
  "noCopy",
  "linePairing",
  // Before the squeeze on purpose: the same configuration reaches both, and this one settles the whole
  // stretch in a single sentence rather than ruling out its squares one at a time.
  "loneMark",
  "squeeze",
] as const

export type EclipseTechniqueId = (typeof ECLIPSE_TECHNIQUES)[number]

/**
 * The order a **hint** reaches for a reason: whichever is quickest to see, not whichever is weakest.
 *
 * Two different jobs need two different orders. `ECLIPSE_TECHNIQUES` above is the strength ladder, and a
 * tier's cap is a prefix of it — that is what decides which reasoning a board may be built to need. This
 * list decides which of the reasons that *do* apply gets said out loud, and the answer is the one a player
 * spots first: a sign with a filled end, then a line that already has all of one mark (it settles several
 * squares at once), then the local readings, and the counting arguments last.
 *
 * Every rung appears exactly once in both, which `techniques.spec.ts` checks.
 */
export const ECLIPSE_HINT_ORDER: readonly EclipseTechniqueId[] = [
  "sign",
  "lineCount",
  "noTriple",
  "signPair",
  "noCopy",
  "linePairing",
  "loneMark",
  "squeeze",
]

export type EclipseDecision = { cell: number; mark: Mark }

export type EclipseStep = {
  technique: EclipseTechniqueId
  /** Which reading of the technique fired — each is a different sentence to the player. */
  variant?: string
  /** The mark the reason is about — every sentence names one, as a glyph rather than a word. */
  mark?: Mark
  /** How many of that mark the reason counts, for the sentences that say a number. */
  count?: number
  /** The cells the reason talks about, the decided one first. */
  cells: number[]
  /** Index into the puzzle's links, for the reasons that point at a sign. */
  link?: number
  decisions: EclipseDecision[]
}

export type Marks = (Mark | undefined)[]

export const techniqueRank = (id: EclipseTechniqueId): number => ECLIPSE_TECHNIQUES.indexOf(id)

const halfOf = (puzzle: EclipsePuzzle) => puzzle.size / 2

/** Rows with rows, columns with columns: a row reading like a column is a coincidence, not a rule. */
const lineGroups = (puzzle: EclipsePuzzle): number[][][] => [
  lines(puzzle.size).slice(0, puzzle.size),
  lines(puzzle.size).slice(puzzle.size),
]

/** A sign next to a filled cell says what its partner is. */
const signSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  puzzle.links.flatMap((link, index) => {
    const ends: [number, number][] = [
      [link.a, link.b],
      [link.b, link.a],
    ]
    return ends.flatMap(([known, unknown]) => {
      const mark = marks[known]
      if (mark === undefined || marks[unknown] !== undefined) return []
      const decided = link.kind === "same" ? mark : other(mark)
      return [
        {
          technique: "sign" as const,
          variant: link.kind,
          mark,
          cells: [unknown, known],
          link: index,
          decisions: [{ cell: unknown, mark: decided }],
        },
      ]
    })
  })

/**
 * No three of a mark in a line, read from the two cells that are already filled.
 *
 * Two variants because they are two different sentences: a **pair** already sitting together forbids its
 * neighbours, and a **sandwich** (`A _ A`) forbids its own middle.
 */
const noTripleSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line =>
    line.flatMap((_unused, index) => {
      const window = line.slice(index, index + 3)
      if (window.length < 3) return []
      const [, second] = window
      const filled = window.filter(cell => marks[cell] !== undefined)
      if (filled.length !== 2) return []
      const [a, b] = filled
      if (marks[a] !== marks[b]) return []
      const empty = window.find(cell => marks[cell] === undefined)!
      return [
        {
          technique: "noTriple" as const,
          variant: empty === second ? "sandwich" : "pair",
          mark: marks[a]!,
          cells: [empty, a, b],
          decisions: [{ cell: empty, mark: other(marks[a]!) }],
        },
      ]
    })
  )

/** A line already holding half of one mark: everything left in it is the other. */
const lineCountSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line => {
    const empty = line.filter(cell => marks[cell] === undefined)
    if (!empty.length) return []
    return (["sun", "moon"] as Mark[]).flatMap(mark => {
      const held = line.filter(cell => marks[cell] === mark)
      if (held.length !== halfOf(puzzle)) return []
      return [
        {
          technique: "lineCount" as const,
          variant: mark,
          mark,
          count: held.length,
          cells: [...empty, ...held],
          decisions: empty.map(cell => ({ cell, mark: other(mark) })),
        },
      ]
    })
  })

/**
 * No line may copy another of its own kind, read off a line with **two** squares left.
 *
 * Two, not one: a six-line with one square left already holds three of some mark, so `lineCount` decides it
 * first — every one-gap line is preempted, which made the one-gap reading of this rule dead code. With two
 * gaps the line still needs one of each mark, so there are exactly two ways to fill it; if one of them would
 * copy a finished line, the other is forced, and both squares fall at once.
 *
 * The sentence is the appeal — "fill it that way and this row is a copy of that one" is a reason a player can
 * check by eye.
 */
const noCopySteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lineGroups(puzzle).flatMap(group => {
    const done = group.filter(line => line.every(cell => marks[cell] !== undefined))
    if (!done.length) return []
    return group.flatMap(line => {
      const empty = line.filter(cell => marks[cell] === undefined)
      if (empty.length !== 2) return []
      const gaps = empty.map(cell => line.indexOf(cell))
      const twin = done.find(other =>
        other.every((cell, index) => gaps.includes(index) || marks[cell] === marks[line[index]])
      )
      if (!twin) return []
      // The banned filling is the twin's own, so the answer is the other way round — and the two gaps take
      // one mark each, which is what makes "the other way round" a single option rather than a guess.
      const banned = gaps.map(index => marks[twin[index]]!)
      if (banned[0] === banned[1]) return []
      return [
        {
          technique: "noCopy" as const,
          cells: [...empty, ...twin],
          decisions: empty.map((cell, index) => ({ cell, mark: other(banned[index]) })),
        },
      ]
    })
  })

/**
 * A matching pair standing next to a filled square: it cannot take that square's mark.
 *
 * `=` means the two are the same, so taking the mark beside them would make three of a kind in a row. One
 * step, one sentence — "because of that ☀️, these two are 🌙" — and it is the reason a player reaches for
 * long before any counting.
 */
const signPairSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line =>
    puzzle.links.flatMap((link, index) => {
      if (link.kind !== "same") return []
      const [first, second] = [line.indexOf(link.a), line.indexOf(link.b)].sort((a, b) => a - b)
      // Both ends in this line, side by side in it, and both still empty.
      if (first === -1 || second !== first + 1) return []
      if (marks[link.a] !== undefined || marks[link.b] !== undefined) return []
      const neighbours = [line[first - 1], line[second + 1]].filter(cell => cell !== undefined)
      const blocking = neighbours.find(cell => marks[cell] !== undefined)
      if (blocking === undefined) return []
      const mark = marks[blocking]!
      return [
        {
          technique: "signPair" as const,
          mark,
          cells: [link.a, link.b, blocking],
          link: index,
          decisions: [
            { cell: link.a, mark: other(mark) },
            { cell: link.b, mark: other(mark) },
          ],
        },
      ]
    })
  )

/** The links whose two cells both sit unfilled inside this line. */
const linksInside = (puzzle: EclipsePuzzle, line: number[], marks: Marks): { link: Link; index: number }[] =>
  puzzle.links
    .map((link, index) => ({ link, index }))
    .filter(
      ({ link }) =>
        line.includes(link.a) && line.includes(link.b) && marks[link.a] === undefined && marks[link.b] === undefined
    )

/**
 * Counting a line with its signs taken into account — the rung where a sign stops being local.
 *
 * - **`sameNoRoom`**: a matching pair needs two of whichever mark it takes, so a line with one sun left
 *   cannot spend it on the pair; both are moons.
 * - **`differentTakesOne`**: a differing pair always spends exactly one sun, so once those are counted the
 *   rest of the line can be settled even though nothing next to it is filled.
 */
const linePairingSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line => {
    const inside = linksInside(puzzle, line, marks)
    if (!inside.length) return []
    const empty = line.filter(cell => marks[cell] === undefined)
    return (["sun", "moon"] as Mark[]).flatMap(mark => {
      const room = halfOf(puzzle) - line.filter(cell => marks[cell] === mark).length
      const sameNoRoom = inside
        .filter(({ link }) => link.kind === "same")
        .filter(() => room === 1)
        .map(({ link, index }) => ({
          technique: "linePairing" as const,
          variant: "sameNoRoom",
          mark,
          count: room,
          cells: [link.a, link.b],
          link: index,
          decisions: [
            { cell: link.a, mark: other(mark) },
            { cell: link.b, mark: other(mark) },
          ],
        }))
      if (sameNoRoom.length) return sameNoRoom
      // Each differing pair spends one of this mark, so what is left over belongs to the squares outside them
      // — but **only pairs that share no square may be counted**. Two × signs meeting at one square (or the
      // same sign listed twice) do not spend two of a mark between them, and counting them as if they did was
      // unsound: it "spent" suns the line never spent and then settled the rest of the line on that.
      const differing: typeof inside = []
      const paired = new Set<number>()
      for (const candidate of inside.filter(({ link }) => link.kind === "different")) {
        if (paired.has(candidate.link.a) || paired.has(candidate.link.b)) continue
        differing.push(candidate)
        paired.add(candidate.link.a)
        paired.add(candidate.link.b)
      }
      const loose = empty.filter(cell => !paired.has(cell))
      if (!differing.length || !loose.length || room - differing.length !== 0) return []
      return [
        {
          technique: "linePairing" as const,
          variant: "differentTakesOne",
          mark,
          count: differing.length,
          cells: [...loose, ...paired],
          link: differing[0].index,
          decisions: loose.map(cell => ({ cell, mark: other(mark) })),
        },
      ]
    })
  })

/** Which of a line's own rules a filled-in line breaks, and the squares that show it. */
const lineFaults = (
  puzzle: EclipsePuzzle,
  marks: Marks,
  line: number[]
): { rule: "triple" | "copy" | "sign"; cells: number[] } | undefined => {
  for (let index = 2; index < line.length; index++) {
    const run = [line[index - 2], line[index - 1], line[index]]
    const [first, second, third] = run.map(cell => marks[cell])
    if (first !== undefined && first === second && second === third) return { rule: "triple", cells: run }
  }
  const sign = puzzle.links.find(
    link =>
      line.includes(link.a) &&
      line.includes(link.b) &&
      marks[link.a] !== undefined &&
      marks[link.b] !== undefined &&
      (link.kind === "same") !== (marks[link.a] === marks[link.b])
  )
  if (sign) return { rule: "sign", cells: [sign.a, sign.b] }
  const group = lineGroups(puzzle).find(candidate => candidate.includes(line)) ?? []
  const twin = group.find(
    other =>
      other !== line &&
      other.every(cell => marks[cell] !== undefined) &&
      line.every(cell => marks[cell] !== undefined) &&
      other.every((cell, index) => marks[cell] === marks[line[index]])
  )
  return twin ? { rule: "copy", cells: twin } : undefined
}

/** Which rule a filled-in board falls foul of, and the squares that show it. */
export type EclipseBreakage = { rule: "sign" | "copy" | "triple" | "balance"; cells: number[] }

/**
 * The first rule this board breaks, if any.
 *
 * **It returns which rule and where, not just "broken".** Contradiction reasoning is only worth saying out
 * loud if it can name the rule it ran into — "the board breaks a rule" is a sentence the player cannot check,
 * and it was what the top tier's hint used to say.
 */
const breakage = (puzzle: EclipsePuzzle, marks: Marks): EclipseBreakage | undefined => {
  const broken = brokenLinks(puzzle, { marks })
  if (broken.length) return { rule: "sign", cells: [broken[0].a, broken[0].b] }

  for (const group of lineGroups(puzzle)) {
    const done = group.filter(line => line.every(cell => marks[cell] !== undefined))
    for (const [index, line] of done.entries()) {
      const twin = done.find(
        (other, otherIndex) => otherIndex !== index && other.every((cell, at) => marks[cell] === marks[line[at]])
      )
      if (twin) return { rule: "copy", cells: [...line, ...twin] }
    }
  }

  const half = halfOf(puzzle)
  for (const line of lines(puzzle.size)) {
    for (let index = 2; index < line.length; index++) {
      const run = [line[index - 2], line[index - 1], line[index]]
      const [first, second, third] = run.map(cell => marks[cell])
      if (first !== undefined && first === second && second === third) return { rule: "triple", cells: run }
    }
    for (const mark of ["sun", "moon"] as Mark[]) {
      const held = line.filter(cell => marks[cell] === mark)
      if (held.length > half) return { rule: "balance", cells: held }
    }
  }
  return undefined
}

/**
 * Counting that squeezes a line, and the rule the squeeze runs into.
 *
 * **This is the reasoning a person actually does on a wide line.** Suppose this square takes the moon; then
 * the suns this line still owes have to fill every other empty square in it — counting alone forces them —
 * and three of those squares sit together, which is not allowed. So the square is a sun.
 *
 * One step, and both halves are checkable where the player is already looking: what the line owes, and where
 * the run would fall.
 */
const squeezeSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line => {
    const empty = line.filter(cell => marks[cell] === undefined)
    // One empty square is `lineCount`'s business; there is nothing left to squeeze.
    if (empty.length < 2) return []
    const half = halfOf(puzzle)
    for (const cell of empty) {
      for (const mark of ["sun", "moon"] as Mark[]) {
        const rest = empty.filter(other => other !== cell)
        const filler = other(mark)
        const held = (wanted: Mark) => line.filter(at => marks[at] === wanted).length
        // Does taking this mark leave the line owing exactly as many of the other as it has squares left?
        if (held(mark) + 1 > half) continue
        if (half - held(filler) !== rest.length) continue
        const trial = [...marks]
        trial[cell] = mark
        for (const at of rest) trial[at] = filler
        const fault = lineFaults(puzzle, trial, line)
        if (!fault) continue
        return [
          {
            technique: "squeeze" as const,
            variant: fault.rule,
            mark,
            cells: [cell, ...fault.cells.filter(at => at !== cell), ...rest.filter(at => !fault.cells.includes(at))],
            decisions: [{ cell, mark: other(mark) }],
          },
        ]
      }
    }
    return []
  })

/**
 * One mark left to place in a line, and only one place it can go.
 *
 * The other half of how a person reads a wide line. `[sun sun _ _ _ _ _ sun]` on an eight-board owes one
 * more sun across five squares — so four of them are moons, and the sun has to sit where it keeps those
 * moons from running three together. On a six-board `[sun _ _ _ _ sun]` it is the same reading: two moons,
 * a sun, two moons.
 *
 * Exact enumeration finds this too and can only say that every filling agreed. Here the sentence is the
 * reasoning: **only one of this mark is still owed, and only one spot for it avoids three of the other.**
 */
const loneMarkSteps = (puzzle: EclipsePuzzle, marks: Marks): EclipseStep[] =>
  lines(puzzle.size).flatMap(line => {
    const empty = line.filter(cell => marks[cell] === undefined)
    if (empty.length < 3) return []
    const half = halfOf(puzzle)
    for (const mark of ["sun", "moon"] as Mark[]) {
      const owed = half - line.filter(cell => marks[cell] === mark).length
      if (owed !== 1) continue
      const spots = empty.filter(spot => {
        const trial = [...marks]
        for (const cell of empty) trial[cell] = cell === spot ? mark : other(mark)
        return !lineFaults(puzzle, trial, line)
      })
      if (spots.length !== 1) continue
      const [spot] = spots
      return [
        {
          technique: "loneMark" as const,
          variant: mark,
          mark,
          count: owed,
          cells: [spot, ...empty.filter(cell => cell !== spot)],
          decisions: empty.map(cell => ({ cell, mark: cell === spot ? mark : other(mark) })),
        },
      ]
    }
    return []
  })

const IMPLEMENTATIONS: Record<EclipseTechniqueId, (puzzle: EclipsePuzzle, marks: Marks) => EclipseStep[]> = {
  sign: signSteps,
  noTriple: noTripleSteps,
  signPair: signPairSteps,
  lineCount: lineCountSteps,
  noCopy: noCopySteps,
  linePairing: linePairingSteps,
  loneMark: loneMarkSteps,
  squeeze: squeezeSteps,
}

/**
 * The cheapest technique that decides something, or undefined when nothing is forced.
 *
 * `allowed` is the board's own tier, so a starter board never explains itself with reasoning it was
 * never built to need. It stays in ladder order: taking the first technique that fires is what keeps a
 * hint cheap.
 */
export const nextEclipseStep = (
  puzzle: EclipsePuzzle,
  marks: Marks,
  allowed: readonly EclipseTechniqueId[] = ECLIPSE_TECHNIQUES
): EclipseStep | undefined => {
  for (const technique of allowed) {
    const [step] = IMPLEMENTATIONS[technique](puzzle, marks)
    if (step) return step
  }
  return undefined
}

const MAX_PASSES = 2000

/** Carries a board as far as the `allowed` techniques take it, writing into `marks`. */
export const applyEclipseTechniques = (
  puzzle: EclipsePuzzle,
  marks: Marks,
  allowed: readonly EclipseTechniqueId[] = ECLIPSE_TECHNIQUES
): EclipseStep[] => {
  const steps: EclipseStep[] = []
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const step = nextEclipseStep(puzzle, marks, allowed)
    if (!step) break
    const live = step.decisions.filter(decision => marks[decision.cell] === undefined)
    if (!live.length) break
    for (const decision of live) marks[decision.cell] = decision.mark
    steps.push({ ...step, decisions: live })
  }
  return steps
}

export type EclipseSolveResult = {
  marks: Marks
  /** Every cell reached by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: EclipseStep[]
  /** The strongest technique the board actually demanded. */
  deepest?: EclipseTechniqueId
}

export const solveEclipseByTechniques = (
  puzzle: EclipsePuzzle,
  allowed: readonly EclipseTechniqueId[] = ECLIPSE_TECHNIQUES
): EclipseSolveResult => {
  const marks: Marks = [...puzzle.given]
  const steps = applyEclipseTechniques(puzzle, marks, allowed)
  return {
    marks,
    settled: marks.every(mark => mark !== undefined) && breakage(puzzle, marks) === undefined,
    steps,
    deepest: steps.reduce<EclipseTechniqueId | undefined>(
      (deepest, step) =>
        !deepest || techniqueRank(step.technique) > techniqueRank(deepest) ? step.technique : deepest,
      undefined
    ),
  }
}
