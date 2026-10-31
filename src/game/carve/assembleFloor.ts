import { defaultResolveEncounter } from "../encounterFallback"
import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import { roomlessRouteStubs } from "../routeStubs"
import type { AssembleFloorKeyRequirements, ResolveEncounter } from "../siteAssembler"
import type { AssemblerResult, FloorConfig } from "../siteTypes"
import { layWebDoors, WEB_SAND_REALISATION, webSandKindRefusals } from "../webDoors"
import { carveFloor } from "./carveFloor"
import { CARVE_ENGINE, type Engine } from "./engines"
import { gateKeyOf } from "./ids"
import { webDoorInPrefab } from "./placePrefabs"
import { prepareFloor } from "./prepareFloor"
import { CARVE_FAMILY_QUERIES } from "../encounterFallback"

// Where a floor's `locks` become its layout, obstacles and controls, so the bake, the sweeps and the
// runtime all carve the one expanded config; a floor without locks passes through untouched.
export const assembleFloor = (
  siteId: string,
  authoredConfig: FloorConfig,
  addressSeed: number,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  keyRequirements: AssembleFloorKeyRequirements = {},
  options: { engine?: Engine } = {}
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
      ? carveFloor(prepared.prep, options.engine ?? CARVE_ENGINE)
      : { success: false, reasons: prepared.reasons }
  }
  // A carve leaving a route region's stub with no room is carved again with such stubs answering to the region their
  // corridor leads to (`answerBareStubs`), so every floor whose stubs hold a room carves as it always has.
  const first = carve(false)
  const result = plan && first.success && roomlessRouteStubs(first.grid).length > 0 ? carve(true) : first
  if (!result.success) return result
  const nested = expanded.nesting ? { ...result, grid: { ...result.grid, lockNesting: expanded.nesting } } : result
  // THE WEB'S DOORS GO ON THE FINISHED CARVE, never into it: a web door moves no wall. Where no registered mod realises
  // web sand they are left off, and every one of them is open ground.
  const doors = authoredConfig.webDoors ?? []
  const gates = expanded.webGates ?? []
  const { resolveRegionBarrier } = keyRequirements
  const realised = !resolveRegionBarrier || resolveRegionBarrier(WEB_SAND_REALISATION) !== undefined
  if ((doors.length === 0 && gates.length === 0) || !realised) return nested
  // One sand kind per site: this floor's own lock may not bind sand beside its web's. The rest of the site is the
  // bake's to check (`webSandKindRefusals` over every floor).
  const mixed = webSandKindRefusals([authoredConfig])
  if (mixed.length > 0) return { success: false, reasons: mixed }
  const floorRef = keyRequirements.floorRef ?? { journeyId: siteId, floorIndex: 0 }
  const gateTags = resolveEncounter(CARVE_FAMILY_QUERIES.keyGate, CARVE_FAMILY_QUERIES.keyGate).tags
  const marked = authoredConfig.webMarks ? { ...nested.grid, webMarks: authoredConfig.webMarks } : nested.grid
  const laid = layWebDoors(marked, doors, gates, gateTags, id => gateKeyOf(floorRef, id))
  if (!laid.ok) return { success: false, reasons: [laid.fault] }
  // A designed room's walls are drawn round its own arms: a web door standing inside one is a fault, as an unseated
  // door is.
  const inside = webDoorInPrefab(marked, laid.grid)
  return inside ? { success: false, reasons: [inside] } : { ...nested, grid: laid.grid }
}
