import { firstEclipseMistake, other, type EclipseMarks, type Mark } from "@/mods/puzzle/game/eclipse/eclipse"
import { techniquesUpTo, type EclipsePuzzleWithAnswer } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { ECLIPSE_HINT_ORDER, nextEclipseStep, type EclipseStep } from "@/mods/puzzle/game/eclipse/techniques"

/**
 * A mark as a glyph rather than a word.
 *
 * A glyph slot keeps a hint language-free (PUZZLE_FAMILIES.md P2) where "a sun" would not — and naming the
 * marks is what lets a hint state the fact it found ("this line already holds four ☀️, so the rest are 🌙")
 * instead of the shape of the deduction ("that mark is not allowed, so it is the other one").
 */
const GLYPH: Record<Mark, string> = { sun: "☀️", moon: "🌙" }

export type EclipseHint = {
  /** Translation key under `eclipse.hint`. */
  key: string
  /** Slots for the key's template: the marks as glyphs, and the number a reason counts. */
  params: { mark?: string; other?: string; count?: number }
  /** The cells the reason talks about, so the board can point at what it is reasoning from. */
  cells: ReadonlySet<number>
  /**
   * Every square the step settles, and the move that goes with them.
   *
   * A reason on its own leaves the player working out what it wants of them, and several of these rungs fill
   * a whole line — so the squares are hatched and the move names the hatching
   * (`puzzle-screens.md` §4). `fillMixed` is the reading where the squares do not all take the same mark,
   * which `noCopy` and the pairing rungs can produce.
   */
  decided: ReadonlySet<number>
  action: { key: "fill" | "fillMixed"; mark?: string; count: number } | undefined
  /** The square the reason is ABOUT, drawn apart from its evidence — "this square" has to be one square. */
  focus?: number
  /** Signs the reason points at, so "these two must match" has something to point to. */
  links: ReadonlySet<number>
}

// A technique that reads as a different sentence each way round gets a key per reading: "two of these
// already sit together" and "the squares either side match" are the same rule and different advice.
const stepKey = (step: EclipseStep): string =>
  step.technique === "lineCount" ? step.technique : [step.technique, step.variant].filter(Boolean).join(".")

/**
 * The next thing to say to the player: a wrong mark first, otherwise the cheapest technique that fires.
 *
 * The ladder is the board's own — a starter board never explains itself with reasoning it was never built
 * to need — and the hint names the move rather than the answer, so following it is still the player's step.
 */
export const buildEclipseHint = (
  puzzle: EclipsePuzzleWithAnswer,
  state: EclipseMarks,
  solution: readonly Mark[]
): EclipseHint | undefined => {
  const mistake = firstEclipseMistake(state.marks, solution)
  // A wrong mark has no move to offer: the way out is the player's to find, and naming it would be naming
  // the answer.
  if (mistake !== undefined)
    return {
      key: "mistake",
      params: {},
      cells: new Set([mistake]),
      decided: new Set([mistake]),
      action: undefined,
      focus: mistake,
      links: new Set(),
    }

  // Inside the board's own ladder, but asked in the order a player would spot them: several reasons often
  // apply at once, and the one worth saying is the quickest to see rather than the weakest.
  const allowed = techniquesUpTo(puzzle.techniqueCap)
  const step = nextEclipseStep(
    puzzle,
    [...state.marks],
    ECLIPSE_HINT_ORDER.filter(id => allowed.includes(id))
  )
  if (!step) return undefined
  const marks = new Set(step.decisions.map(decision => decision.mark))
  const [only] = [...marks]
  return {
    key: stepKey(step),
    decided: new Set(step.decisions.map(decision => decision.cell)),
    action:
      marks.size === 1
        ? { key: "fill", mark: GLYPH[only], count: step.decisions.length }
        : { key: "fillMixed", count: step.decisions.length },
    params: step.mark
      ? { mark: GLYPH[step.mark], other: GLYPH[other(step.mark)], count: step.count }
      : { count: step.count },
    cells: new Set(step.cells),
    focus: step.decisions[0]?.cell ?? step.cells[0],
    links: new Set(step.link === undefined ? [] : [step.link]),
  }
}
