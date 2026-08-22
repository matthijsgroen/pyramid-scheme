import {
  firstMistake,
  nextStep,
  type SumpleteMark,
  type SumpletePuzzleData,
  type SumpleteStep,
  type TechniqueId,
} from "@/mods/puzzle/game/sumplete/techniques"

export type SumpleteHint = {
  /** Translation key under `sumplete.hint`, plus the numbers that fill its slots. */
  key: string
  params: { deficit?: number; value?: number; remaining?: number }
  cells: Set<string>
  line?: { kind: "row" | "col"; index: number }
  /**
   * The move the reason asks for, and how many numbers it is about.
   *
   * A second line, and an imperative one, naming the numbers by how the board draws them
   * (`puzzle-screens.md` §4): several of these rungs decide a whole line's worth at once, and "so everything
   * else has to go" left the player working out which numbers that was.
   */
  action?: { key: "strike" | "keep"; count: number }
}

const key = (row: number, col: number) => `${row},${col}`

// Parity splits by which way it decides: "the only odd number left has to stay" and "...has to go"
// are different sentences, though the technique is one. Row and column get their own keys as well —
// a hint that says "row" or "column" is easier to act on than one that says "line", and naming the
// two in a shared slot would break the moment a locale inflects around the word.
const SPLIT_BY_DIRECTION = new Set(["parity", "inEveryCombination"])

const stepKey = (step: SumpleteStep): string => {
  const technique = SPLIT_BY_DIRECTION.has(step.technique)
    ? `${step.technique}${step.decisions[0].mark === "keep" ? "Keep" : "Strike"}`
    : step.technique
  return `${technique}.${step.line}`
}

const asHint = (step: SumpleteStep): SumpleteHint => ({
  key: stepKey(step),
  params: {
    deficit: step.deficit,
    value: step.value,
    // What the line would still be short of if this number stayed. The reason for striking a cell
    // that no combination uses is about THAT number, not about the target: keeping the 9 of a line
    // needing 11 leaves 2 to find, and nothing left makes 2. Saying "the rest cannot make 11" instead
    // states something false — 6+4+1 makes 11 perfectly well.
    remaining: step.value === undefined ? undefined : step.deficit - step.value,
  },
  cells: new Set(step.decisions.map(decision => key(decision.row, decision.col))),
  line: { kind: step.line, index: step.index },
  // Every step here decides one way or the other for all of its cells, so the move is the first one's.
  action: { key: step.decisions[0].mark === "keep" ? "keep" : "strike", count: step.decisions.length },
})

/**
 * The next thing to say to the player: a wrong mark first, otherwise the cheapest technique that
 * fires. Which techniques are allowed comes from the board's own cap, so a starter board never
 * explains itself with reasoning it was never built to need.
 *
 * "Everything left here stays" is asked of the player rather than assumed: every later reason counts
 * from the cells marked as staying, so a hint that silently leaned on an unconfirmed cell produced
 * arithmetic the player could not follow ("this line still needs 5" against a line reading 22 of 12).
 * Confirming a finished line is the move that makes the next reason legible.
 */
export const buildSumpleteHint = (
  puzzle: SumpletePuzzleData,
  marks: SumpleteMark[][],
  solution: boolean[][],
  cap: TechniqueId
): SumpleteHint | undefined => {
  const mistake = firstMistake(marks, solution)
  // A wrong mark has no move to offer: the way out is the player's to find, and naming it would be naming
  // the answer.
  if (mistake) return { key: "mistake", params: {}, cells: new Set([key(mistake.row, mistake.col)]) }

  const step = nextStep(puzzle, marks, cap)
  return step && asHint(step)
}
