import { hexKey } from "@/mods/puzzle/game/hidato/hex"
import {
  firstHidatoMistake,
  nextHidatoStep,
  type HidatoPuzzleData,
  type PruningId,
} from "@/mods/puzzle/game/hidato/techniques"

export type HidatoHint = {
  /** Translation key under `hidato.hint.reason`, plus the numbers that fill its slots. */
  key: string
  params: { value?: number; before?: number; after?: number; from?: number }
  /** The cell the hint settles — the board hatches it, and the move names the hatching. */
  cell: string
  /** The cells the reason argues from — ringed rather than hatched (puzzle-screens.md §4.2). */
  evidence: ReadonlySet<string>
  /** The number to write, or undefined for a mistake hint, which asks for nothing (§4.1). */
  place?: number
}

/**
 * The next thing to say: a number in the wrong cell first, otherwise the cheapest reason that fires.
 *
 * The ladder is the board's own — the same pruning the tier accepted it under — so a hint never leans
 * on reasoning the board was never gated against.
 */
export const buildHidatoHint = (
  puzzle: HidatoPuzzleData,
  values: Record<string, number>,
  solution: Record<string, number>,
  pruning: PruningId
): HidatoHint | undefined => {
  const mistake = firstHidatoMistake(values, solution)
  if (mistake) return { key: "mistake", params: {}, cell: hexKey(mistake.cell), evidence: new Set<string>() }

  const step = nextHidatoStep(puzzle, values, pruning)
  return (
    step && {
      key: step.technique,
      params: step.params,
      cell: hexKey(step.cell),
      evidence: new Set(step.evidence.map(hexKey)),
      place: step.value,
    }
  )
}
