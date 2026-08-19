import { cellKey, firedWirings, isLit, pieceCells, type BeamSegment } from "@/mods/puzzle/game/lightbeam/beam"
import type { LightbeamPuzzle } from "@/mods/puzzle/game/lightbeam/generateLightbeam"
import { solveLightbeamByTechniques, type LightbeamStep } from "@/mods/puzzle/game/lightbeam/techniques"

export type LightbeamHint = {
  /** Translation key under `lightbeam.hint`. */
  key: string
  /** The piece the reason is about, so the board can single it out. */
  piece?: number
  /** Cell keys the reason points at. */
  cells: ReadonlySet<string>
  /** The stretch of beam the reason is about — "the light dies here" means nothing without showing where. */
  beam: BeamSegment[]
}

const stepKey = (step: LightbeamStep): string => [step.technique, step.variant].filter(Boolean).join(".")

const asHint = (puzzle: LightbeamPuzzle, step: LightbeamStep): LightbeamHint => ({
  key: stepKey(step),
  piece: step.piece,
  cells: new Set([
    ...step.beam.map(segment => cellKey(segment.at)),
    ...(step.piece === undefined ? [] : pieceCells(puzzle.movable[step.piece]).map(cellKey)),
  ]),
  beam: step.beam,
})

/**
 * The next thing to say to the player.
 *
 * Unlike the families where the player writes numbers down, there is nothing here to be *wrong* about in
 * the way a misplaced digit is wrong — every setting is a legal setting. So a hint is not a correction, it
 * is the first reason the player has not yet acted on: the deduction is replayed from a blank board, and
 * the hint is the earliest step whose conclusion the board in front of them contradicts. Follow it and the
 * hint moves on by itself.
 *
 * A piece the player has been fiddling with that the light can never reach comes second, and only when
 * nothing is actually set wrong — that is `neverReached` earning its keep, and it is the one hint in the
 * game whose advice is to leave something alone.
 */
/**
 * The reasons the ladder finds on this board — **the expensive half, and it depends on the puzzle alone.**
 *
 * A full solve, which is 618ms on a top-tier board because the exhaustive rungs enumerate the configuration
 * space. It reads nothing about how the player has the board set: the state only decides which of these reasons
 * is worth saying, which is what `pickLightbeamHint` does and which costs nothing. So this is derived **once per
 * board** and every hint after the first is free.
 *
 * It is also why the whole thing is precomputable offline (`docs/offline-puzzle-seeds.md`): a pure function of
 * the puzzle, and about 400 bytes serialised.
 */
export const lightbeamHintSteps = (puzzle: LightbeamPuzzle): LightbeamStep[] =>
  solveLightbeamByTechniques(puzzle, puzzle.techniqueCap).steps

/** The cheap half: which of the reasons to say, given how the player has the board set. */
export const pickLightbeamHint = (
  puzzle: LightbeamPuzzle,
  steps: readonly LightbeamStep[],
  states: readonly number[]
): LightbeamHint | undefined => {
  if (isLit(puzzle, states)) return undefined

  for (const step of steps)
    for (const decision of step.decisions)
      if (decision.kind === "eliminate" && decision.states.includes(states[decision.piece])) return asHint(puzzle, step)

  // Then the ordering fact, when the light is not yet going through the socket it has to go through. This
  // one is not "you have set something wrong" — every setting is legal — it is "there is a door in your way
  // and this is what opens it", which is the whole of what a socket asks and is invisible until said.
  const crossing = firedWirings(puzzle, states)
  for (const step of steps)
    for (const decision of step.decisions)
      if (decision.kind === "fires" && !crossing.has(decision.wiring)) return asHint(puzzle, step)

  for (const step of steps)
    for (const decision of step.decisions)
      if (decision.kind === "free" && states[decision.piece] !== puzzle.initial[decision.piece])
        return asHint(puzzle, step)

  // Nothing the player holds is ruled out, which on a settled board means the light is already on its
  // way — but a stalled board (a cap that could not finish it, which generation rejects) still deserves
  // the run it does know about rather than silence.
  return steps.length ? asHint(puzzle, steps[0]) : undefined
}

/** Both halves at once, for callers with no board to keep the reasons on — specs, stories, the odd one-shot. */
export const buildLightbeamHint = (puzzle: LightbeamPuzzle, states: readonly number[]): LightbeamHint | undefined =>
  pickLightbeamHint(puzzle, lightbeamHintSteps(puzzle), states)
