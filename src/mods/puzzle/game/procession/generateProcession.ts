import { mulberry32 } from "@/game/random"
import type { Grade } from "@/game/families/familyMeta"
import type { Mark, MarkKind, ProcessionPuzzle } from "./procession"
import { markHolds } from "./procession"
import { countArrangements, requiredRung, RUNGS, type Rung } from "./solveProcession"

export type ProcessionOptions = {
  /** How wide the day is. The board's only size knob, and the one the phone binds (family doc §5). */
  ticks: number
  /** How many things happen in it — one to a row. */
  bars: number
  minLen: number
  maxLen: number
  /** The largest gap a `link` may carry, so the numeral on a bracket stays a number a child adds. */
  maxGap: number
  /** Which marks this tier may be built from. THIS is what the lower rungs are made of (`READS`). */
  kinds: readonly MarkKind[]
  /** The band the board's required rung must fall in. THIS is the tier (family doc §3). */
  minRung: Rung
  maxRung: Rung
  /**
   * How many suppositions the board must demand, once it is on the split rung.
   *
   * **What separates the top two tiers, since the rung cannot.** A supposition inside a supposition does
   * not occur on boards this size (`solveProcession.ts`), so depth is not available as a knob — how much
   * of the board only gives way to a supposition is.
   *
   * Counted as CANDIDATES struck by a supposition rather than as suppositions made, which is the number
   * the solver actually has; one supposition often strikes several. The ceiling matters as much as the
   * floor: a board where almost nothing yields to propagation is a board the player supposes their way
   * through square by square, which is the long-and-not-hard shape §3.2 of the catalogue rules out.
   */
  minSplits: number
  maxSplits: number
}

/**
 * How many days are rolled before the search gives up.
 *
 * A day is cheap to roll and cheap to judge — the whole cost of an attempt is the thinning pass, which is
 * one uniqueness search per mark on a board of at most six bars. So the loop can afford to be long, and
 * the deep tiers need it: most days do not thin down to a board that demands a split.
 */
const MAX_ATTEMPTS = 400

const rungIndex = (rung: Rung) => RUNGS.indexOf(rung)

/** The day itself: what happens, for how long, and when. The answer the marks are read off. */
const rollDay = (random: () => number, options: ProcessionOptions) => {
  const lens = Array.from(
    { length: options.bars },
    () => options.minLen + Math.floor(random() * (options.maxLen - options.minLen + 1))
  )
  const starts = lens.map(len => Math.floor(random() * (options.ticks - len + 1)))
  // **A day that leaves both ends empty is a smaller day than the one authored**, and it makes `span` a
  // statement about nothing in particular. Rolled again rather than nudged: a roll costs nothing.
  const first = Math.min(...starts)
  const last = Math.max(...starts.map((start, index) => start + lens[index]))
  return first <= 1 && last >= options.ticks - 1 ? { lens, starts } : undefined
}

/**
 * Every mark the day makes true — before thinning, and deliberately far more than a board can show.
 *
 * The marks overlap each other on purpose (a `link` implies a `before` implies an `apart`), because what
 * survives the thinning is then a CHOICE between ways of saying the same thing rather than the only thing
 * that could be said, and two boards rolled from similar days come out reading differently.
 */
const marksOf = (lens: number[], starts: number[], options: ProcessionOptions): Mark[] => {
  const allowed = (kind: MarkKind) => options.kinds.includes(kind)
  const marks: Mark[] = []
  if (allowed("pin")) starts.forEach((tick, a) => marks.push({ kind: "pin", a, tick }))
  for (let a = 0; a < lens.length; a++)
    for (let b = 0; b < lens.length; b++) {
      if (a === b) continue
      const gap = starts[b] - (starts[a] + lens[a])
      const clash = starts[a] < starts[b] + lens[b] && starts[b] < starts[a] + lens[a]
      if (gap >= 0 && gap <= options.maxGap && allowed("link")) marks.push({ kind: "link", a, b, gap })
      if (gap >= 0 && allowed("before")) marks.push({ kind: "before", a, b })
      if (a < b && !clash && allowed("apart")) marks.push({ kind: "apart", a, b })
      if (a < b && clash && allowed("together")) marks.push({ kind: "together", a, b })
    }
  if (allowed("span")) {
    const first = Math.min(...starts)
    const last = Math.max(...starts.map((start, index) => start + lens[index]))
    marks.push({ kind: "span", ticks: last - first })
  }
  return marks
}

/**
 * The order marks are offered up for removal: the ones that give an answer away first.
 *
 * **Thinning is what makes a board hard, so the order it thins in is the difficulty knob nobody has to
 * set.** A pin hands a bar over outright and a link hands over the next one, so trying those first leaves
 * boards whose remaining marks are relations — which is the only way a tier above `chain` is ever reached.
 */
const EASE: MarkKind[] = ["pin", "link", "before", "span", "together", "apart"]

const thin = (puzzle: ProcessionPuzzle, random: () => number): ProcessionPuzzle => {
  const order = puzzle.marks
    .map((mark, index) => ({ index, rank: EASE.indexOf(mark.kind) + random() }))
    .sort((one, two) => one.rank - two.rank)
    .map(entry => entry.index)

  let kept = puzzle.marks
  for (const index of order) {
    const mark = puzzle.marks[index]
    const without = kept.filter(other => other !== mark)
    if (without.length === kept.length) continue
    // **Uniqueness is the only thing checked here, and it is also what keeps the board anchored.** Drop
    // every pin and the whole day can slide along the track as a block, which is exactly a second
    // arrangement — so the degenerate case fails this test rather than needing a rule of its own.
    if (countArrangements({ ...puzzle, marks: without }, 2) === 1) kept = without
  }
  return { ...puzzle, marks: kept }
}

/** Where the bars stand when the room opens: anywhere but the answer, and never a board that opens solved. */
const scramble = (random: () => number, puzzle: ProcessionPuzzle): ProcessionPuzzle => {
  const bars = puzzle.bars.map(bar => ({ ...bar, start: Math.floor(random() * (puzzle.ticks - bar.len + 1)) }))
  return { ...puzzle, bars }
}

/**
 * A board whose marks admit exactly one arrangement, and which needs the rung its tier asks for.
 *
 * **Rolled, read off, thinned, then judged** — the shape `puzzle-screens.md` §6.1 asks a searching family
 * to have, where the gate is a separate thing from the construction. The construction cannot fail: any day
 * yields marks that describe it exactly. What varies is whether the thinned board lands in the tier's band,
 * and that is `gradeProcession`, which the loop below calls rather than re-implements.
 */
export const generateProcession = (
  seed: number,
  options: ProcessionOptions,
  attempts = MAX_ATTEMPTS
): ProcessionPuzzle => {
  const random = mulberry32(seed)
  for (let attempt = 0; attempt < attempts; attempt++) {
    const day = rollDay(random, options)
    if (!day) continue
    const bars = day.lens.map((len, index) => ({ len, start: day.starts[index] }))
    const marks = marksOf(day.lens, day.starts, options)
    const thinned = thin({ ticks: options.ticks, bars, marks }, random)
    const board = scramble(random, thinned)
    if (gradeProcession(board, options)) return board
  }
  throw new Error("procession: no board found")
}

/**
 * The generator's own gate, re-run on a finished board (`familyMeta.ts`'s `seedable`).
 *
 * Three questions, and a board has to answer all three: does exactly one arrangement satisfy the marks,
 * does the ladder reach it, and is the rung it needs the one this tier is for. The fourth is cheaper than
 * it looks and is the one that would embarrass us — a board whose scramble happens to BE the answer opens
 * already solved.
 */
export const gradeProcession = (puzzle: ProcessionPuzzle, options: ProcessionOptions): Grade | null => {
  if (
    puzzle.marks.every(mark =>
      markHolds(
        puzzle,
        puzzle.bars.map(bar => bar.start),
        mark
      )
    )
  )
    return null
  if (countArrangements(puzzle, 2) !== 1) return null
  const ladder = requiredRung(puzzle)
  if (!ladder) return null
  if (rungIndex(ladder.rung) < rungIndex(options.minRung)) return null
  if (rungIndex(ladder.rung) > rungIndex(options.maxRung)) return null
  if (ladder.splits < options.minSplits || ladder.splits > options.maxSplits) return null
  return { steps: ladder.steps, deepest: ladder.rung }
}
