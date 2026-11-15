import { mulberry32 } from "../random"
import type { AssemblerResult } from "../siteTypes"
import type { Engine } from "./engines"
import { ASSEMBLY_ATTEMPTS } from "./ladder"
import { noShortfalls, reasonsOf, rememberAttempt } from "./shortfalls"
import type { CarveState, FloorPrep, PassEntry, Refusal, Rung } from "./state"

/** Runs an attempt's passes in order, stopping at the first that refuses. */
const runPasses = (prep: FloorPrep, state: CarveState, passes: readonly PassEntry[]): Refusal | void => {
  for (const { run } of passes) {
    const refusal = run(prep, state)
    if (refusal) return refusal
  }
}

/** One attempt: its rung and its own stream, every pass, then the tail. */
const carveAttempt = (prep: FloorPrep, engine: Engine, attempt: number, rung: Rung) => {
  const state: CarveState = { attempt, rung, rand: mulberry32(prep.input.seed + attempt * 7919) }
  return { state, outcome: runPasses(prep, state, engine.passes) ?? engine.finish(prep, state) }
}

/**
 * THE ATTEMPT LOOP: each attempt climbs the ladder, runs every pass over a fresh state and then the
 * tail (the engine's `finish`: render, validate, the pieces, finish), until one carves or the budget is spent. The rung and the shortfalls are all it carries from one
 * attempt to the next.
 */
export const carveFloor = (prep: FloorPrep, engine: Engine): AssemblerResult => {
  // A BAKED START IS THE ATTEMPT THE LADDER SETTLES ON, carved as that attempt is: its own rung and its own stream.
  const start = prep.input.carveFrom
  if (start && start.attempt < Math.min(prep.input.maxAttempts, ASSEMBLY_ATTEMPTS)) {
    const { outcome } = carveAttempt(prep, engine, start.attempt, start.rung)
    if (!("fatal" in outcome) && !("retry" in outcome)) return { success: true, grid: outcome, ...start }
  }
  let rung = engine.firstRung(prep)
  let memory = noShortfalls
  for (let attempt = 0; attempt < Math.min(prep.input.maxAttempts, ASSEMBLY_ATTEMPTS); attempt++) {
    rung = engine.climb(prep, attempt, rung)
    const { state, outcome } = carveAttempt(prep, engine, attempt, rung)
    // The lay grows the grid even on an attempt it then fails, and the next rung starts from it.
    if (state.laidN !== undefined) rung = { ...rung, n: state.laidN }
    if ("fatal" in outcome) return { success: false, reasons: outcome.fatal }
    if (!("retry" in outcome)) return { success: true, grid: outcome, attempt, rung }
    memory = rememberAttempt(memory, state, outcome)
  }
  return { success: false, reasons: reasonsOf(memory) }
}
