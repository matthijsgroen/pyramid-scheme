// The deduction system behind both generation and hints, per docs/game-design/puzzles/balance-scale.md
// §4.
//
// The rule that shapes this file: **the solver never reasons about a scale the player cannot see.**
// It used to cancel matching glyphs silently, so a hint would call a glyph "the only one left" while
// the board plainly showed a scale with four things on it. Every reduction is now a move that writes
// a note, and a technique only reads rows that are on screen.
// The difficulty ladder: what a board may DEMAND of a player, and what a tier's cap is set from.
export const TECHNIQUES = ["alone", "equalShares", "difference", "swap"] as const

// Taking the same thing off both pans decides nothing — it writes a simpler row to read. So it is
// not a rung: it is available at every tier, and it is suggested only once nothing can be read as
// the board stands. On a row that can already be read, reading it is the move.
export const REDUCTIONS = ["cancelGlyph", "cancelStones"] as const

export type TechniqueId = (typeof TECHNIQUES)[number] | (typeof REDUCTIONS)[number]

const isReduction = (id: TechniqueId): boolean => (REDUCTIONS as readonly string[]).includes(id)

/** The symbol drawn on an unknown weight. Identity only — the solver never reads it. */
export type Glyph = string

export type PanItem = { kind: "weight"; value: number } | { kind: "glyph"; glyph: Glyph }

export type Scale = { left: PanItem[]; right: PanItem[] }

export type Pan = "left" | "right"

/**
 * A row the player worked out: the same two pans as any scale, drawn without a beam. Notes are
 * scales in every other way — the solver reads them, and they can be worked on in turn.
 */
export type Note = Scale

export type BalancePuzzleData = {
  glyphs: Glyph[]
  scales: Scale[]
  /** Top of the weight range: the palette's last button, and the heaviest weight a technique claims. */
  maxValue: number
  /**
   * Whether this board offers taking things off both pans at all. Off below the tier that teaches it,
   * because the move DOES THE ARITHMETIC: `🐈 7 = 15` with the 7 taken off both sides is `🐈 = 8`,
   * and working out 15 − 7 was the whole puzzle. A board must not hand out its own answer.
   */
  cancelling?: boolean
}

/** What the player has decided so far; a glyph with no entry is still unknown. */
export type BalanceAssignment = Record<Glyph, number | undefined>

/** Where a reason points: a scale drawn on the board, or one of the player's own notes. */
export type EquationRef = { kind: "scale" | "note"; index: number }

export type Equation = { ref: EquationRef; scale: Scale }

export type BalanceStep = {
  technique: TechniqueId
  /** The row(s) the reason points at. */
  refs: EquationRef[]
  /** The glyph the move is about, where it is about one. */
  glyph?: Glyph
  /** Set when the step works out a new row. */
  note?: Note
  /** Set when the step settles a weight. */
  decision?: { glyph: Glyph; value: number; count: number; total: number }
}

export const otherPan = (pan: Pan): Pan => (pan === "left" ? "right" : "left")

export const allEquations = (puzzle: BalancePuzzleData, notes: Note[] = []): Equation[] => [
  ...puzzle.scales.map((scale, index) => ({ ref: { kind: "scale" as const, index }, scale })),
  ...notes.map((scale, index) => ({ ref: { kind: "note" as const, index }, scale })),
]

const countGlyph = (items: PanItem[], glyph: Glyph): number =>
  items.filter(item => item.kind === "glyph" && item.glyph === glyph).length

const stoneTotal = (items: PanItem[]): number =>
  items.reduce((sum, item) => sum + (item.kind === "weight" ? item.value : 0), 0)

/** Stones plus every glyph the player has already weighed — the part of a pan that reads as a number. */
const knownTotal = (items: PanItem[], assignment: BalanceAssignment): number =>
  items.reduce((sum, item) => sum + (item.kind === "weight" ? item.value : (assignment[item.glyph] ?? 0)), 0)

const unknownGlyphs = (items: PanItem[], assignment: BalanceAssignment): Glyph[] =>
  items.flatMap(item => (item.kind === "glyph" && assignment[item.glyph] === undefined ? [item.glyph] : []))

/** Same row, whichever way it was drawn — used to keep a note off the board twice. */
export const scaleKey = ({ left, right }: Scale): string => [sideKey(left), sideKey(right)].sort().join("|")

/**
 * What a row actually says, once the pans are weighed against each other: `🦅 🦅 6 = 🦅 🦅 4 2` says
 * nothing at all, and `🦅 🦅 🦅 = 🏺` says the same as `🏺 = 🦅 🦅 🦅`. Only used to keep useless and
 * repeated rows off the board — never to reason with, because the player cannot see it.
 */
export const meaningOf = (scale: Scale, assignment: BalanceAssignment): string | undefined => {
  const { coeffs, constant } = netOf(scale, assignment)
  if (!coeffs.size) return undefined
  const entries = [...coeffs].sort(([a], [b]) => a.localeCompare(b))
  const flip = entries[0][1] < 0 ? -1 : 1
  return entries.map(([glyph, coeff]) => `${coeff * flip}${glyph}`).join() + `|${constant * flip}`
}

const removeGlyphs = (items: PanItem[], glyph: Glyph, count: number): PanItem[] => {
  const kept: PanItem[] = []
  let toRemove = count
  for (const item of items) {
    if (toRemove > 0 && item.kind === "glyph" && item.glyph === glyph) toRemove--
    else kept.push(item)
  }
  return kept
}

const withStones = (items: PanItem[], stones: number): PanItem[] => [
  ...items.filter(item => item.kind === "glyph"),
  ...(stones > 0 ? [{ kind: "weight" as const, value: stones }] : []),
]

const sideKey = (items: PanItem[]): string =>
  items
    .map(item => (item.kind === "weight" ? `#${item.value}` : item.glyph))
    .sort()
    .join()

// A row is only worth writing down if something unknown is still on it, both pans still hold
// something, and the two pans are not the same: `🏺 = 🏺` and `🪲 = 🪲` are true and useless.
const worthKeeping = (scale: Scale, assignment: BalanceAssignment): boolean =>
  scale.left.length > 0 &&
  scale.right.length > 0 &&
  sideKey(scale.left) !== sideKey(scale.right) &&
  [...unknownGlyphs(scale.left, assignment), ...unknownGlyphs(scale.right, assignment)].length > 0

/**
 * Whether this piece has its match across the beam — the same glyph, or a number against numbers.
 * One tap takes both off. The board marks these, and the rules mention the move only where the
 * board affords it, so the two can never disagree.
 */
export const hasTwin = (scale: Scale, item: PanItem): boolean =>
  item.kind === "weight"
    ? scale.left.some(other => other.kind === "weight") && scale.right.some(other => other.kind === "weight")
    : countGlyph(scale.left, item.glyph) > 0 && countGlyph(scale.right, item.glyph) > 0

export const hasTwinnedPiece = (scale: Scale): boolean =>
  [...scale.left, ...scale.right].some(item => hasTwin(scale, item))

/** Take the same glyph off both pans. The move a player makes by tapping one of them. */
export const cancelGlyph = (scale: Scale, glyph: Glyph, assignment: BalanceAssignment = {}): Note | undefined => {
  const count = Math.min(countGlyph(scale.left, glyph), countGlyph(scale.right, glyph))
  if (!count) return undefined
  const note = {
    left: removeGlyphs(scale.left, glyph, count),
    right: removeGlyphs(scale.right, glyph, count),
  }
  return worthKeeping(note, assignment) ? note : undefined
}

/** Take the same number of stones off both pans. */
export const cancelStones = (scale: Scale, assignment: BalanceAssignment = {}): Note | undefined => {
  const left = stoneTotal(scale.left)
  const right = stoneTotal(scale.right)
  const take = Math.min(left, right)
  if (!take) return undefined
  const note = { left: withStones(scale.left, left - take), right: withStones(scale.right, right - take) }
  return worthKeeping(note, assignment) ? note : undefined
}

/**
 * What a row says one glyph is worth, when it says it plainly: a pan holding that glyph and nothing
 * else. That is the only shape a swap can be made from — lifting the glyph off and putting the other
 * pan's contents in its place is a trade a player can actually do.
 */
export const definitionOf = (
  scale: Scale,
  assignment: BalanceAssignment
): { glyph: Glyph; equals: PanItem[] } | undefined => {
  for (const pan of ["left", "right"] as const) {
    const [only] = scale[pan]
    if (scale[pan].length !== 1 || only.kind !== "glyph" || assignment[only.glyph] !== undefined) continue
    return { glyph: only.glyph, equals: scale[otherPan(pan)] }
  }
  return undefined
}

/** The row left when there is nothing more to take off both pans. Used to judge whether starting is
 * worth it — never shown, and never reasoned from. */
export const fullyCancelled = (scale: Scale, assignment: BalanceAssignment): Scale => {
  let current = scale
  for (let guard = 0; guard < 20; guard++) {
    const glyph = current.left
      .flatMap(item => (item.kind === "glyph" ? [item.glyph] : []))
      .find(candidate => cancelGlyph(current, candidate, assignment))
    const next = glyph ? cancelGlyph(current, glyph, assignment) : cancelStones(current, assignment)
    if (!next) return current
    current = next
  }
  return current
}

/** How wide a pan may get before a swap stops being readable on a phone. */
const MAX_PAN_ITEMS = 6

/** Loose stones on a pan add up to one stone: `1 14` is a pan holding 15, and reads better as one. */
const merged = (items: PanItem[]): PanItem[] => withStones(items, stoneTotal(items))

/** One copy of the glyph, lifted out and replaced by what the definition says it is worth. */
export const swapGlyph = (target: Scale, definition: { glyph: Glyph; equals: PanItem[] }): Note | undefined => {
  for (const pan of ["left", "right"] as const) {
    const index = target[pan].findIndex(item => item.kind === "glyph" && item.glyph === definition.glyph)
    if (index === -1) continue
    const items = merged([...target[pan].slice(0, index), ...definition.equals, ...target[pan].slice(index + 1)])
    if (items.length > MAX_PAN_ITEMS) return undefined
    return pan === "left" ? { left: items, right: merged(target.right) } : { left: merged(target.left), right: items }
  }
  return undefined
}

// The scale as a number sentence, for the techniques that settle a weight: how many of each unknown
// glyph sit on each pan, and what the rest of the pan adds up to.
type Reading = { glyph: Glyph; count: number; total: number }

/** A row with exactly one unknown glyph left, all of it on one pan: `count × glyph = total`. */
const readSingleGlyph = (
  scale: Scale,
  assignment: BalanceAssignment,
  maxValue: number
): (Reading & { value: number }) | undefined => {
  const unknown = new Set([...unknownGlyphs(scale.left, assignment), ...unknownGlyphs(scale.right, assignment)])
  if (unknown.size !== 1) return undefined
  const [glyph] = unknown
  const left = countGlyph(scale.left, glyph)
  const right = countGlyph(scale.right, glyph)
  // On both pans it cancels first — that is a move, not a reading.
  if (left && right) return undefined
  const count = left || right
  const holder = left ? scale.left : scale.right
  const rest = left ? scale.right : scale.left
  const total = knownTotal(rest, assignment) - knownTotal(holder, assignment)
  if (total <= 0 || total % count !== 0) return undefined
  const value = total / count
  return value >= 1 && value <= maxValue ? { glyph, count, total, value } : undefined
}

/** A row with no glyph standing on both pans reads as "the same apart from…" against another. */
const isCancelFree = (scale: Scale): boolean =>
  scale.left.every(item => item.kind === "weight" || !countGlyph(scale.right, item.glyph))

const netOf = (scale: Scale, assignment: BalanceAssignment) => {
  const coeffs = new Map<Glyph, number>()
  for (const glyph of unknownGlyphs(scale.left, assignment)) coeffs.set(glyph, (coeffs.get(glyph) ?? 0) + 1)
  for (const glyph of unknownGlyphs(scale.right, assignment)) coeffs.set(glyph, (coeffs.get(glyph) ?? 0) - 1)
  // A glyph standing the same number of times on both pans weighs nothing in the balance between
  // them — it is not one of the things this row is about.
  for (const [glyph, coeff] of coeffs) if (coeff === 0) coeffs.delete(glyph)
  return { coeffs, constant: knownTotal(scale.right, assignment) - knownTotal(scale.left, assignment) }
}

/** How many notes the solver will work up before it gives up on a board. */
export const MAX_NOTES = 5

/** A row is worth writing only if it says something none of the rows already there says. */
export const newRowTest = (equations: Equation[], assignment: BalanceAssignment): ((note: Note) => boolean) => {
  const said = new Set(equations.flatMap(equation => meaningOf(equation.scale, assignment) ?? []))
  return note => {
    const meaning = meaningOf(note, assignment)
    return meaning !== undefined && !said.has(meaning)
  }
}

/**
 * Whether a move is a step or a shuffle, judged on the row it leads to once there is nothing more to
 * take off both pans: it has to be a row that can be **read** (one glyph left against numbers) or
 * **traded from** (one glyph alone on a pan).
 *
 * This is deliberately strict, and it is a rule about the puzzles rather than about the solver. A
 * looser test — "fewer different glyphs than before" — lets the solver chase two- and three-move
 * chains, and it wanders: it fills the board with rows that were on the way to something. A board
 * whose route needs that is simply not generated (design doc §4.4).
 */
const leadsSomewhere = (note: Note, assignment: BalanceAssignment, maxValue: number): boolean => {
  const end = fullyCancelled(note, assignment)
  return !!readSingleGlyph(end, assignment, maxValue) || !!definitionOf(end, assignment)
}

type Technique = (
  equations: Equation[],
  puzzle: BalancePuzzleData,
  assignment: BalanceAssignment
) => BalanceStep | undefined

/**
 * Taking the same thing off both pans — but only where it **gets somewhere**. A player does not
 * cancel everything a board allows; they cancel when the row that comes out can be read (one glyph
 * left against numbers) or can be traded from (one glyph alone on a pan). Cancelling for tidiness
 * fills the board with rows nobody needed, which is what the first build did.
 */
const reductionStep = (
  equations: Equation[],
  puzzle: BalancePuzzleData,
  assignment: BalanceAssignment
): BalanceStep | undefined => {
  if (puzzle.cancelling === false) return undefined
  if (equations.filter(equation => equation.ref.kind === "note").length >= MAX_NOTES) return undefined
  // Cancelling redraws a row; it never changes what the row SAYS. So a cancel is judged on the
  // drawing (is this row already on the board) and on where the cancelling ENDS: a row worth taking
  // apart is one that can be read, or traded from, once there is nothing left to take off it. That
  // is what lets a first cancel be suggested for the sake of the second.
  const drawn = new Set(equations.map(equation => scaleKey(equation.scale)))
  const worth = (note: Note): boolean => !drawn.has(scaleKey(note)) && leadsSomewhere(note, assignment, puzzle.maxValue)

  const candidates: BalanceStep[] = []
  for (const { ref, scale } of equations) {
    const glyphs = new Set(scale.left.flatMap(item => (item.kind === "glyph" ? [item.glyph] : [])))
    for (const glyph of glyphs) {
      const note = cancelGlyph(scale, glyph, assignment)
      if (note && worth(note)) candidates.push({ technique: "cancelGlyph", refs: [ref], glyph, note })
    }
    const stones = cancelStones(scale, assignment)
    if (stones && worth(stones)) candidates.push({ technique: "cancelStones", refs: [ref], note: stones })
  }
  // Smallest row first: the one nearest to being read.
  return candidates.sort((a, b) => size(a.note!) - size(b.note!))[0]
}

const IMPLEMENTATIONS: Record<(typeof TECHNIQUES)[number], Technique> = {
  // One glyph left without a number on it, on its own pan: the row says what it weighs.
  alone: (equations, puzzle, assignment) => {
    for (const equation of equations) {
      const reading = readSingleGlyph(equation.scale, assignment, puzzle.maxValue)
      if (reading?.count === 1)
        return { technique: "alone", refs: [equation.ref], glyph: reading.glyph, decision: reading }
    }
    return undefined
  },
  // Several copies of it against numbers: share them out.
  equalShares: (equations, puzzle, assignment) => {
    for (const equation of equations) {
      const reading = readSingleGlyph(equation.scale, assignment, puzzle.maxValue)
      if (reading && reading.count > 1)
        return { technique: "equalShares", refs: [equation.ref], glyph: reading.glyph, decision: reading }
    }
    return undefined
  },
  // Two rows that are the same apart from one glyph. Only rows with nothing standing on both pans,
  // so that "the same apart from" is something the player can see rather than derive.
  difference: (equations, puzzle, assignment) => {
    const readable = equations.filter(equation => isCancelFree(equation.scale))
    for (let a = 0; a < readable.length; a++)
      for (let b = a + 1; b < readable.length; b++) {
        const first = netOf(readable[a].scale, assignment)
        const second = netOf(readable[b].scale, assignment)
        const coeffs = new Map(first.coeffs)
        for (const [glyph, coeff] of second.coeffs) {
          const combined = (coeffs.get(glyph) ?? 0) - coeff
          if (combined === 0) coeffs.delete(glyph)
          else coeffs.set(glyph, combined)
        }
        if (coeffs.size !== 1) continue
        const [[glyph, signed]] = [...coeffs]
        const count = Math.abs(signed)
        const constant = first.constant - second.constant
        const total = signed < 0 ? -constant : constant
        if (total <= 0 || total % count !== 0) continue
        const value = total / count
        if (value < 1 || value > puzzle.maxValue) continue
        return {
          technique: "difference",
          refs: [readable[a].ref, readable[b].ref],
          glyph,
          decision: { glyph, value, count, total },
        }
      }
    return undefined
  },
  // A row holding one glyph alone on a pan says what that glyph is worth anywhere. Lift a copy of it
  // out of another row and put the equivalent in its place. Settles nothing by itself, which is why
  // it ranks last — it works out a row to read from.
  swap: (equations, puzzle, assignment) => {
    if (equations.filter(equation => equation.ref.kind === "note").length >= MAX_NOTES) return undefined
    const isNew = newRowTest(equations, assignment)
    const candidates: BalanceStep[] = []
    for (const source of equations) {
      const definition = definitionOf(source.scale, assignment)
      if (!definition) continue
      for (const target of equations) {
        if (target === source) continue
        // A glyph that also stands across the beam comes off in one tap, and that is what tapping it
        // does — so the board could not offer this swap even if the solver liked it.
        if (cancelGlyph(target.scale, definition.glyph, assignment)) continue
        const note = swapGlyph(target.scale, definition)
        // A swap that lands in another tangle is not a step: same test as a cancel.
        if (!note || !isNew(note) || !leadsSomewhere(note, assignment, puzzle.maxValue)) continue
        candidates.push({ technique: "swap", refs: [source.ref, target.ref], glyph: definition.glyph, note })
      }
    }
    // The tidiest swap, not the first one found: a note is something the player has to read.
    return candidates.sort((a, b) => size(a.note!) - size(b.note!))[0]
  },
}

const size = (note: Note): number => note.left.length + note.right.length

export const techniqueRank = (id: TechniqueId): number => (TECHNIQUES as readonly string[]).indexOf(id)

// Read what the board already says, then simplify a row so more can be read, and only then trade a
// glyph for what a row says it is worth. Swapping grows the board, so it is the last thing to reach
// for; cancelling sits between because it never settles anything on its own.
const readingsFor = (cap: TechniqueId): (typeof TECHNIQUES)[number][] =>
  TECHNIQUES.slice(0, techniqueRank(cap) + 1).filter(id => id !== "swap")

/**
 * The cheapest technique that moves this board on, or undefined when nothing is forced. Each
 * technique scans top-down, so hints walk down the board in the order it is read (§6).
 */
export const nextStep = (
  puzzle: BalancePuzzleData,
  assignment: BalanceAssignment,
  notes: Note[] = [],
  cap: TechniqueId = "difference"
): BalanceStep | undefined => {
  const equations = allEquations(puzzle, notes)
  for (const technique of readingsFor(cap)) {
    const step = IMPLEMENTATIONS[technique](equations, puzzle, assignment)
    if (step) return step
  }
  const reduction = reductionStep(equations, puzzle, assignment)
  if (reduction) return reduction
  return techniqueRank(cap) >= techniqueRank("swap") ? IMPLEMENTATIONS.swap(equations, puzzle, assignment) : undefined
}

/**
 * The first weight the player set that contradicts the answer, if any. A hint engine must check this
 * first: every technique reads the scales through the weights already given, so once one of them is
 * wrong the deductions that follow are advice toward a dead end.
 */
export const firstMistake = (
  glyphs: Glyph[],
  assignment: BalanceAssignment,
  solution: Record<Glyph, number>
): Glyph | undefined => glyphs.find(glyph => assignment[glyph] !== undefined && assignment[glyph] !== solution[glyph])

export type BalanceSolveResult = {
  assignment: BalanceAssignment
  notes: Note[]
  /** Every glyph decided by deduction alone — the board never needs a guess. */
  settled: boolean
  steps: BalanceStep[]
  /** The strongest technique the board actually demanded, undefined for a board with no glyphs. */
  deepest?: TechniqueId
}

// A board that keeps producing steps without settling is a bug, not a puzzle; the ceiling is well
// above what any tier's board needs.
const MAX_STEPS = 40

/** Applies techniques up to `cap` until nothing more is forced. */
export const solveByTechniques = (puzzle: BalancePuzzleData, cap: TechniqueId = "difference"): BalanceSolveResult => {
  const assignment: BalanceAssignment = {}
  const notes: Note[] = []
  const steps: BalanceStep[] = []
  for (let step = nextStep(puzzle, assignment, notes, cap); step; step = nextStep(puzzle, assignment, notes, cap)) {
    if (step.decision) assignment[step.decision.glyph] = step.decision.value
    if (step.note) notes.push(step.note)
    steps.push(step)
    if (steps.length >= MAX_STEPS) break
  }
  return {
    assignment,
    notes,
    settled: puzzle.glyphs.every(glyph => assignment[glyph] !== undefined),
    steps,
    // Cancelling is not difficulty — a board is as hard as the hardest thing it makes you READ.
    deepest: steps.reduce<TechniqueId | undefined>(
      (deepest, step) =>
        isReduction(step.technique)
          ? deepest
          : !deepest || techniqueRank(step.technique) > techniqueRank(deepest)
            ? step.technique
            : deepest,
      undefined
    ),
  }
}
