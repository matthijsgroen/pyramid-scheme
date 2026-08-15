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

const stepKey = (step: SumpleteStep): string =>
  step.technique === "parity" ? (step.decisions[0].mark === "keep" ? "parityKeep" : "parityStrike") : step.technique

/**
 * The next thing to say to the player: a wrong mark first, otherwise the cheapest technique that
 * fires. Which techniques are allowed comes from the board's own cap, so a starter board never
 * explains itself with reasoning it was never built to need.
 */
export const buildSumpleteHint = (
  puzzle: SumpletePuzzleData,
  marks: SumpleteMark[][],
  solution: boolean[][],
  cap: TechniqueId
): SumpleteHint | undefined => {
  const mistake = firstMistake(marks, solution)
  if (mistake) return { key: "mistake", params: {}, cells: new Set([key(mistake.row, mistake.col)]) }

  const step = nextStep(puzzle, marks, cap)
  if (!step) return undefined
  return {
    key: stepKey(step),
    params: { deficit: step.deficit, value: step.value },
    cells: new Set(step.decisions.map(decision => key(decision.row, decision.col))),
    line: { kind: step.line, index: step.index },
  }
}
