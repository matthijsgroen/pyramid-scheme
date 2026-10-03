import { encounterFromMeta, type ResolveEncounter } from "@/game/siteAssembler"
import type { ResolveOneWayRealisation } from "@/game/oneWayRealisation"
import type { ResolveRegionBarrierRealisation } from "@/game/regionBarrierRealisation"
import type { AssemblerReason, AssemblerResult, FloorGrid } from "@/game/siteTypes"
import { ALL_FAMILY_META, resolveEncounterMeta } from "@/mods/allFamilyMeta"
import { MOD_ONE_WAY_REALISATIONS, MOD_REGION_BARRIER_REALISATIONS, REGISTERED_MOD_IDS } from "@/mods/registeredMods"

/**
 * THE BUILD AS IT STANDS WITH THE TOPOLOGY MOD REMOVED FROM `registeredMods`: the registered ids, the family
 * catalogue and the one-way realisations that remain. What a registered-mod aggregate answers once the mod
 * is out of its list, without editing that list.
 */
const MOD = "topology"
const WITHOUT = ALL_FAMILY_META.filter(meta => meta.ownerMod !== MOD)

const resolveWithout: ResolveEncounter = (encounter, defaultTag) => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const meta = WITHOUT.find(m => m.id === value) ?? WITHOUT.find(m => m.tags.includes(value))
  return encounterFromMeta(meta, value)
}

const oneWayWithout: ResolveOneWayRealisation = id =>
  id === undefined ? undefined : MOD_ONE_WAY_REALISATIONS.find(r => r.id === id && r.ownerMod !== MOD)

const regionBarrierWithout: ResolveRegionBarrierRealisation = id =>
  id === undefined ? undefined : MOD_REGION_BARRIER_REALISATIONS.find(r => r.id === id && r.ownerMod !== MOD)

export const TOPOLOGY_ON = { modIds: REGISTERED_MOD_IDS, resolveEncounter: resolveEncounterMeta }

export const TOPOLOGY_OFF = {
  modIds: new Set([...REGISTERED_MOD_IDS].filter(id => id !== MOD)),
  resolveEncounter: resolveWithout,
  resolveOneWay: oneWayWithout,
  resolveRegionBarrier: regionBarrierWithout,
}

/** The reasons that mean "a mod that dresses this mechanic is not here", the only way a mod's absence may refuse a floor. */
export const REALISATION_REFUSALS = new Set<AssemblerReason["type"]>([
  "realisationMissing",
  "oneWayRealisationRefused",
  "regionBarrierRealisationRefused",
])

/** A carve as its walls: each cell's `dirs`, never its type, since a door is a room where a corridor stood. */
export const dirsOf = (grid: FloorGrid): string =>
  grid.cells
    .map(row => row.map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join(""))).join("|"))
    .join("\n")

/** What a mod's absence did to one floor: nothing to the walls, or a refusal by name. Never other walls. */
export type Outcome =
  | { kind: "identical" }
  | { kind: "refused"; reasons: AssemblerReason[] }
  | { kind: "moved" }
  | { kind: "notCarvedWithMod" }

export const outcomeOf = (withMod: AssemblerResult, without: AssemblerResult): Outcome => {
  if (!withMod.success) return { kind: "notCarvedWithMod" }
  if (!without.success) return { kind: "refused", reasons: without.reasons }
  return dirsOf(without.grid) === dirsOf(withMod.grid) ? { kind: "identical" } : { kind: "moved" }
}

/** True where a refusal is wholly a missing realisation, so the mod's absence is the whole reason. */
export const isRealisationRefusal = (outcome: Outcome): boolean =>
  outcome.kind === "refused" && outcome.reasons.every(reason => REALISATION_REFUSALS.has(reason.type))
