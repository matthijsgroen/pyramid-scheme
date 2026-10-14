import { defaultResolveEncounter } from "../encounterFallback"
import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import { roomlessRouteStubs } from "../routeStubs"
import type { AssembleFloorKeyRequirements, ResolveEncounter } from "../siteAssembler"
import type { AssemblerResult, FloorConfig } from "../siteTypes"
import { carveFloor } from "./carveFloor"
import { finishAttempt, PASSES } from "./passes"
import { prepareFloor } from "./prepareFloor"

// Where a floor's `locks` become its layout, obstacles and controls, so the bake, the sweeps and the
// runtime all carve the one expanded config; a floor without locks passes through untouched.
export const assembleFloor = (
  siteId: string,
  authoredConfig: FloorConfig,
  addressSeed: number,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  keyRequirements: AssembleFloorKeyRequirements = {}
): AssemblerResult => {
  const expanded = expandFloorLocks(authoredConfig)
  if (!expanded.ok) return { success: false, reasons: expanded.reasons }
  const plan = planLockFloor(expanded)
  const carve = (answerStubs: boolean): AssemblerResult => {
    const prepared = prepareFloor(
      siteId,
      expanded.config,
      addressSeed,
      { ...keyRequirements, resolveEncounter },
      plan,
      answerStubs
    )
    return prepared.ok
      ? carveFloor(prepared.prep, PASSES, finishAttempt)
      : { success: false, reasons: prepared.reasons }
  }
  // A carve leaving a route region's stub with no room is carved again with such stubs answering to the region their
  // corridor leads to (`answerBareStubs`), so every floor whose stubs hold a room carves as it always has.
  const first = carve(false)
  const result = plan && first.success && roomlessRouteStubs(first.grid).length > 0 ? carve(true) : first
  if (!result.success || !expanded.nesting) return result
  return { ...result, grid: { ...result.grid, lockNesting: expanded.nesting } }
}
