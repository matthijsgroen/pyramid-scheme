import { mulberry32 } from "../random"
import type { AssemblerResult } from "../siteTypes"
import { ASSEMBLY_ATTEMPTS, climb, firstRung } from "./ladder"
import { noShortfalls, reasonsOf, rememberAttempt } from "./shortfalls"
import type { CarveState, Finish, FloorPrep, PassEntry, Refusal } from "./state"

/** Runs an attempt's passes in order, stopping at the first that refuses. */
const runPasses = (prep: FloorPrep, state: CarveState, passes: readonly PassEntry[]): Refusal | void => {
  for (const { run } of passes) {
    const refusal = run(prep, state)
    if (refusal) return refusal
  }
}

/**
 * THE ATTEMPT LOOP: each attempt climbs the ladder, runs every pass over a fresh state and then the
 * tail (`finishAttempt`: render, validate, the pieces, finish), until one carves or the budget is spent. The rung and the shortfalls are all it carries from one
 * attempt to the next.
 */
export const carveFloor = (prep: FloorPrep, passes: readonly PassEntry[], finishAttempt: Finish): AssemblerResult => {
  let rung = firstRung(prep)
  let memory = noShortfalls
  for (let attempt = 0; attempt < Math.min(prep.input.maxAttempts, ASSEMBLY_ATTEMPTS); attempt++) {
    rung = climb(prep, attempt, rung)
    const state: CarveState = { attempt, rung, rand: mulberry32(prep.input.seed + attempt * 7919) }
    const outcome = runPasses(prep, state, passes) ?? finishAttempt(prep, state)
    // The lay grows the grid even on an attempt it then fails, and the next rung starts from it.
    if (state.laidN !== undefined) rung = { ...rung, n: state.laidN }
    if ("fatal" in outcome) return { success: false, reasons: outcome.fatal }
    if (!("retry" in outcome)) return { success: true, grid: outcome, attempt }
    memory = rememberAttempt(memory, state, outcome)
  }
  return { success: false, reasons: reasonsOf(memory) }
}
