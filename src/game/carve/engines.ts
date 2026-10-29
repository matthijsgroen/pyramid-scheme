import { climb, firstRung } from "./ladder"
import { pickPlan } from "./pickPlan"
import { finishAttempt, PASSES } from "./passes"
import type { Finish, FloorPrep, PassEntry, Rung } from "./state"

/** What carves a floor: the passes an attempt runs, the tail that renders and validates, and the ladder it climbs. */
export type Engine = {
  passes: readonly PassEntry[]
  finish: Finish
  firstRung: (prep: FloorPrep) => Rung
  climb: (prep: FloorPrep, attempt: number, rung: Rung) => Rung
}

export const LATTICE_ENGINE: Engine = { passes: PASSES, finish: finishAttempt, firstRung, climb }

/** The engine every floor is carved with unless a caller passes another. */
export const CARVE_ENGINE: Engine = LATTICE_ENGINE

/** The lattice carve with a floor plan steering the sketch. */
export const ROOMS_ENGINE: Engine = { ...LATTICE_ENGINE, passes: [pickPlan, ...PASSES] }
