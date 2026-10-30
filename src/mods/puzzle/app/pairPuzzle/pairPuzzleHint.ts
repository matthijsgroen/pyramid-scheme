import { firstPairMistake, ruledOutByPieces, type PairMarks } from "@/mods/puzzle/game/pairPuzzle/pairPuzzle"
import type { PairPuzzleWithAnswer } from "@/mods/puzzle/game/pairPuzzle/generatePairPuzzle"
import {
  nextPairStep,
  pairStepFocus,
  pairTechniquesUpTo,
  type PairStep,
} from "@/mods/puzzle/game/pairPuzzle/techniques"

export type PairHint = {
  /** Translation key under `pairPuzzle.hint.<place>`: the reason, on its own line. */
  key: string
  /** What the sentence interpolates. */
  params: { count?: number }
  /** What to do about it, as a key under `pairPuzzle.hint.<place>.action`. */
  action: "ruleOut" | "place" | undefined
  /** How many squares the move settles, the `count` the action line pluralises on. */
  settles: number
  /** The squares the reason argues from: a line, a block or an anchor and its neighbours. */
  cells: ReadonlySet<number>
  /** Every square the step settles. Never an anchor: a step decides open squares only. */
  decided: ReadonlySet<number>
  /** The square the reason is about, drawn strongest. */
  focus?: number
}

const stepKey = (step: PairStep): string => [step.technique, step.variant].filter(Boolean).join(".")

/** Sentences that say a number get a form per count; the rest are one sentence. */
const PLURALISED = new Set(["lineFull", "lineTight", "lineBlock"])

/** The next thing to say: a wrong mark first, otherwise the cheapest rung on the board's own ladder. */
export const buildPairHint = (puzzle: PairPuzzleWithAnswer, state: PairMarks): PairHint | undefined => {
  const mistake = firstPairMistake(state.marks, puzzle.solution)
  if (mistake !== undefined)
    return {
      key: "mistake",
      params: {},
      action: undefined,
      settles: 1,
      cells: new Set(),
      decided: new Set([mistake]),
      focus: mistake,
    }

  // The squares around a piece are drawn as spent (`ruledOutByPieces`), so the hint reasons from them as ruled
  // out too: the adjacency rule is the screen's bookkeeping, never a move the player is asked to make.
  const marks = puzzle.solution.map((_piece, cell) => state.marks[cell])
  for (const spent of ruledOutByPieces(puzzle, marks)) marks[spent] = "empty"
  const step = nextPairStep(puzzle, marks, pairTechniquesUpTo(puzzle.techniqueCap))
  if (!step) return undefined
  return {
    key: stepKey(step),
    params: PLURALISED.has(step.technique) ? { count: step.count } : {},
    action: step.decisions[0]?.mark === "piece" ? "place" : "ruleOut",
    settles: step.decisions.length,
    cells: new Set(step.cells),
    decided: new Set(step.decisions.map(decision => decision.cell)),
    focus: pairStepFocus(step),
  }
}
