import { describe, expect, it } from "vitest"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { floorLock } from "./floorLock"
import type { RealisationBinding } from "./lockCompile"
import { walkFloorLock } from "./floorLockWalk"
import { assembleFloor } from "./siteAssembler"
import type { AssemblerReason, FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { BINDING, sluiceLock } from "./testSupport/lockFixtures"
import { dirsOf, TOPOLOGY_OFF, TOPOLOGY_ON } from "./testSupport/modOff"
import { offRouteSluiceFloor, onRouteSluiceFloor } from "./testSupport/regionBarrierFixtures"

const SEEDS = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)

const bound = (make: () => FloorConfig, realisation: string | undefined): FloorConfig => {
  const { regionBarrierRealisation: _, ...bare } = make()
  return realisation === undefined ? bare : { ...bare, regionBarrierRealisation: realisation }
}

const withRegistry = (config: FloorConfig, seed: number, mods: typeof TOPOLOGY_ON | typeof TOPOLOGY_OFF) =>
  assembleFloor("test", config, seed, mods.resolveEncounter, {
    resolveRegionBarrier: "resolveRegionBarrier" in mods ? mods.resolveRegionBarrier : resolveRegionBarrierRealisation,
  })

const reasonsOf = (result: ReturnType<typeof assembleFloor>): AssemblerReason[] =>
  result.success ? [] : result.reasons

const lockedSluice = (binding: RealisationBinding): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: sluiceLock() }],
  realisations: binding,
})

describe("a region barrier with no realisation bound is refused by name, never given a default", () => {
  it("names each barrier and its region on a floor authoring its obstacles directly", () => {
    expect(reasonsOf(withRegistry(bound(offRouteSluiceFloor, undefined), 1, TOPOLOGY_ON))).toEqual([
      { type: "regionBarrierRealisationRefused", id: "floodedHall", region: "hall", realisation: null, why: "unbound" },
      {
        type: "regionBarrierRealisationRefused",
        id: "floodedVault",
        region: "vault",
        realisation: null,
        why: "unbound",
      },
    ])
  })

  it("names each barrier of a placed lock, under the instance's names, when the binding omits the kind", () => {
    const { "region-barrier": _, ...withoutKind } = BINDING

    expect(reasonsOf(withRegistry(lockedSluice(withoutKind), 1, TOPOLOGY_ON))).toEqual([
      {
        type: "regionBarrierRealisationRefused",
        id: "sluice.floodedHall",
        region: "sluice.hall",
        realisation: null,
        why: "unbound",
      },
      {
        type: "regionBarrierRealisationRefused",
        id: "sluice.floodedVault",
        region: "sluice.vault",
        realisation: null,
        why: "unbound",
      },
    ])
  })
})

describe("a realisation no registered mod provides is refused by name", () => {
  it("refuses one nobody declares, naming what was asked for", () => {
    expect(reasonsOf(withRegistry(bound(onRouteSluiceFloor, "lava"), 1, TOPOLOGY_ON))).toEqual([
      {
        type: "regionBarrierRealisationRefused",
        id: "floodedHall",
        region: "hall",
        realisation: "lava",
        why: "unknown",
      },
    ])
  })

  it.each(["water", "sand"])("refuses %s with the topology mod off, and carves it with the mod on", realisation => {
    const config = bound(onRouteSluiceFloor, realisation)

    expect(reasonsOf(withRegistry(config, 1, TOPOLOGY_OFF))).toEqual([
      { type: "regionBarrierRealisationRefused", id: "floodedHall", region: "hall", realisation, why: "unknown" },
      { type: "realisationMissing", mechanic: "sluice", kind: "toggle", realisation: "default-control" },
    ])
    expect(withRegistry(config, SEEDS[0], TOPOLOGY_ON).success).toBe(true)
  })

  it("declares water and sand as the topology mod's", () => {
    expect(["water", "sand"].map(id => resolveRegionBarrierRealisation(id))).toEqual([
      { id: "water", ownerMod: "topology" },
      { id: "sand", ownerMod: "topology" },
    ])
  })
})

describe("the realisation changes nothing the solver or the carve sees", () => {
  const carvedWith = (make: () => FloorConfig, realisation: string): FloorGrid[] =>
    SEEDS.flatMap(seed => {
      const result = withRegistry(bound(make, realisation), seed, TOPOLOGY_ON)
      return result.success ? [result.grid] : []
    })

  const doorsOf = (grid: FloorGrid): RoomCell[] =>
    grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.regionBarrier ? [cell] : []))

  it.each([
    ["an off-route sluice", offRouteSluiceFloor],
    ["a sluice on the route", onRouteSluiceFloor],
  ])("carves %s with the same walls and the same walk, water or sand", { timeout: 60_000 }, (_, make) => {
    const water = carvedWith(make, "water")
    const sand = carvedWith(make, "sand")

    expect(water.length).toBeGreaterThan(0)
    expect(sand.map(dirsOf)).toEqual(water.map(dirsOf))
    expect(sand.map(grid => walkFloorLock(grid))).toEqual(water.map(grid => walkFloorLock(grid)))
    expect(water.every(grid => floorLock(grid) !== undefined)).toBe(true)
  })

  it.each(["water", "sand"])("stamps every door of every barrier with %s", { timeout: 60_000 }, realisation => {
    const grids = carvedWith(offRouteSluiceFloor, realisation)
    const doors = grids.flatMap(doorsOf)

    expect(doors.length).toBeGreaterThan(0)
    expect(doors.map(door => door.regionBarrier?.realisation)).toEqual(doors.map(() => realisation))
  })
})
