import { encounterFromMeta, type ResolveEncounter } from "@/game/siteAssembler"
import type { ResolveOneWayRealisation } from "@/game/oneWayRealisation"
import { oneWayRuns } from "@/game/gridNavigation"
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

/** A carve as its walls: each cell's `dirs`, never its type, since a door is a room where a corridor stood. */
export const dirsOf = (grid: FloorGrid): string =>
  grid.cells
    .map(row => row.map(cell => (cell.type === "empty" ? "" : [...cell.dirs].sort().join(""))).join("|"))
    .join("\n")

/**
 * A carve as its walls with the ground of every drop the mod-on carve `drops` stands left blank: the launch,
 * the span and the landing of a one-way. Those cells are the one place a missing realisation joins what the
 * mod on leaves apart, so they are named by the carve that has the drops and blanked in both.
 */
export const dirsApartFromDrops = (grid: FloorGrid, drops: FloorGrid): string => {
  const blank = new Set(
    oneWayRuns(drops).flatMap(run => [run.launch, ...run.cells, run.landing].map(at => at.join(",")))
  )
  return grid.cells
    .map((row, r) =>
      row
        .map((cell, c) => (cell.type === "empty" || blank.has(`${r},${c}`) ? "" : [...cell.dirs].sort().join("")))
        .join("|")
    )
    .join("\n")
}

/** What a mod's absence did to one floor: nothing to the walls, a refusal, or other walls. Only the first is right. */
export type Outcome =
  | { kind: "identical" }
  | { kind: "refused"; reasons: AssemblerReason[] }
  | { kind: "moved" }
  | { kind: "notCarvedWithMod" }

/** The walls count as identical when the same everywhere but along a drop the absent realisation turned into a passage. */
export const outcomeOf = (withMod: AssemblerResult, without: AssemblerResult): Outcome => {
  if (!withMod.success) return { kind: "notCarvedWithMod" }
  if (!without.success) return { kind: "refused", reasons: without.reasons }
  return dirsApartFromDrops(without.grid, withMod.grid) === dirsApartFromDrops(withMod.grid, withMod.grid)
    ? { kind: "identical" }
    : { kind: "moved" }
}

/**
 * Whatever of a mechanic is left on a grid, by kind and place: a mechanism or the tile of a sequence, a region
 * barrier, a door face, a cell working a mechanism elsewhere, a drop's span and every door asking for a key a
 * mechanism of `owned` named. Empty for a floor with its mechanics taken off.
 */
export const mechanicsLeft = (grid: FloorGrid, owned: ReadonlySet<string> = new Set()): string[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => {
      const at = `${r},${c}`
      const found: string[] = []
      if (cell.type === "corridor" && cell.obstacle) found.push(`${at} one-way`)
      if (cell.type !== "room") return found
      if (cell.mechanism) found.push(`${at} mechanism`)
      if (cell.mechanismId) found.push(`${at} mechanismId`)
      if (cell.sequenceTile) found.push(`${at} sequenceTile`)
      if (cell.plate) found.push(`${at} plate`)
      if (cell.worksMechanism) found.push(`${at} worksMechanism`)
      if (cell.regionBarrier) found.push(`${at} regionBarrier`)
      if (cell.gateFace) found.push(`${at} gateFace`)
      if (cell.requiredKeyId !== undefined && owned.has(cell.requiredKeyId)) found.push(`${at} shut door`)
      for (const exit of cell.exits ?? []) if (exit.gateKeyId !== undefined) found.push(`${at} way out ${exit.dir}`)
      return found
    })
  )

/** Every gate key a mechanism of the grid names, for asking `mechanicsLeft` what stayed shut once they are gone. */
export const gateKeysOwned = (grid: FloorGrid): Set<string> =>
  new Set(
    grid.cells.flatMap(row =>
      row.flatMap(cell =>
        cell.type === "room" ? (cell.mechanism?.positions ?? []).map(({ gateKeyId }) => gateKeyId) : []
      )
    )
  )
