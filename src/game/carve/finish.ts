import { DOOR_FACE_ROLE } from "../encounterFallback"
import { withGateFaces } from "../gateFace"
import { degradeUnrealised, unrealisedPipes, unrealisedSequences, unrealisedWeights } from "../mechanics/realisations"
import { withPassages } from "../passages"
import type { FloorGrid } from "../siteTypes"
import type { FloorPrep } from "./state"

/**
 * WHAT THE FINISHED CARVE IS DRESSED IN, grid to grid, once every check has read it. What no registered mod
 * realises is taken off — a mechanism room becomes a bare node, a door only it owned stands open, a drop is an
 * ordinary passage — never carved differently. A gate empty hands alone open is dressed as its passage. A door
 * waiting on several owners gains its face last, where something answers to the face role; only the door's
 * family changes, so no wall, `dirs` or slot moves for it.
 */
export const finish = (prep: FloorPrep, grid: FloorGrid): FloorGrid => {
  const { resolveEncounter, floorRef } = prep.input
  const controls = prep.config.authored.controls ?? []
  const bare = degradeUnrealised(grid, resolveEncounter, {
    sequences: unrealisedSequences(controls, resolveEncounter),
    weights: unrealisedWeights(controls, resolveEncounter),
    pipes: unrealisedPipes(controls, resolveEncounter),
    oneWays: prep.realisation.oneWaysUnrealised,
    regionBarriers: prep.realisation.regionBarriersUnrealised,
  })
  const passed = withPassages(bare, prep.realisation.passageKeys)
  const faceFamily = resolveEncounter(undefined, DOOR_FACE_ROLE)
  return withGateFaces(
    passed,
    floorRef.floorIndex,
    new Map(),
    undefined,
    faceFamily.ownerMod === undefined ? null : faceFamily.familyId
  )
}
