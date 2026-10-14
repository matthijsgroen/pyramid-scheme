import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import { mulberry32 } from "../random"
import type { FloorConfig } from "../siteTypes"
import { firstRung } from "./ladder"
import { PASSES } from "./passes"
import { prepareFloor } from "./prepareFloor"
import type { CarveState, FloorPrep } from "./state"

/** A plain floor's config, with what a test sets on it. */
export const plainFloor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

/** The prep of a floor, its locks expanded and planned as `assembleFloor` does; throws where it refuses. */
export const prepOf = (config: FloorConfig, seed = 1): FloorPrep => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
  const result = prepareFloor("site", expanded.config, seed, {}, planLockFloor(expanded))
  if (!result.ok) throw new Error(JSON.stringify(result.reasons))
  return result.prep
}

/** Attempt `attempt`'s state before any pass has run, on the first rung. */
export const freshState = (prep: FloorPrep, attempt = 0): CarveState => ({
  attempt,
  rung: firstRung(prep),
  rand: mulberry32(prep.input.seed + attempt * 7919),
})

/** The state once every pass before `name` has run, or the refusal one of them gave. */
export const stateBefore = (prep: FloorPrep, name: string, attempt = 0) => {
  const state = freshState(prep, attempt)
  for (const entry of PASSES) {
    if (entry.name === name) return { state }
    const refusal = entry.run(prep, state)
    if (refusal) return { state, refusal }
  }
  throw new Error(`no pass named ${name}`)
}
