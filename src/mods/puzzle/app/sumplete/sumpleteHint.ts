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
  params: { deficit?: number; value?: number }
  cells: Set<string>
  line?: { kind: "row" | "col"; index: number }
}

const key = (row: number, col: number) => `${row},${col}`

// Parity splits by which way it decides: "the only odd number left has to stay" and "...has to go"
// are different sentences, though the technique is one.
const stepKey = (step: SumpleteStep): string =>
  step.technique === "parity" ? (step.decisions[0].mark === "keep" ? "parityKeep" : "parityStrike") : step.technique

const asHint = (step: SumpleteStep): SumpleteHint => ({
  key: stepKey(step),
  params: { deficit: step.deficit, value: step.value },
  cells: new Set(step.decisions.map(decision => key(decision.row, decision.col))),
  line: { kind: step.line, index: step.index },
})

/**
 * The next thing to say to the player: a wrong mark first, otherwise the cheapest technique that
 * fires. Which techniques are allowed comes from the board's own cap, so a starter board never
 * explains itself with reasoning it was never built to need.
 *
 * "Everything left here stays" is skipped over rather than said out loud: it only ever fires on a
 * line whose total already matches its target, so it tells the player something the board is already
 * showing them. It is still a real deduction, so it is applied to a scratch copy and the hint becomes
 * whatever it unlocks in a crossing line — the consequence, not the observation.
 */
export const buildSumpleteHint = (
  puzzle: SumpletePuzzleData,
  marks: SumpleteMark[][],
  solution: boolean[][],
  cap: TechniqueId
): SumpleteHint | undefined => {
  const mistake = firstMistake(marks, solution)
  if (mistake) return { key: "mistake", params: {}, cells: new Set([key(mistake.row, mistake.col)]) }

  const working = marks.map(row => [...row])
  let step = nextStep(puzzle, working, cap)
  const first = step
  while (step?.technique === "allKeep") {
    for (const { row, col, mark } of step.decisions) working[row][col] = mark
    step = nextStep(puzzle, working, cap)
  }
  // Nothing but completed lines left: say so rather than go silent — that is the endgame, where the
  // only move left is confirming what stays.
  const chosen = step ?? first
  return chosen && asHint(chosen)
}
