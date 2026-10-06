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

describe("a realisation no registered mod provides leaves the barrier as plain ground", () => {
  const barrierDoors = (grid: FloorGrid): RoomCell[] =>
    grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.regionBarrier ? [cell] : []))
  const carved = (config: FloorConfig, registry: typeof TOPOLOGY_ON | typeof TOPOLOGY_OFF): FloorGrid => {
    const result = withRegistry(config, SEEDS[0], registry)
    if (!result.success) throw new Error(`did not carve: ${JSON.stringify(result.reasons)}`)
    return result.grid
  }

  it("carves one nobody declares with the same walls as water, and no barrier door standing", () => {
    const water = carved(bound(onRouteSluiceFloor, "water"), TOPOLOGY_ON)
    const lava = carved(bound(onRouteSluiceFloor, "lava"), TOPOLOGY_ON)

    expect(barrierDoors(water).length).toBeGreaterThan(0)
    expect(dirsOf(lava)).toBe(dirsOf(water))
    expect(barrierDoors(lava)).toEqual([])
  })

  it.each(["water", "sand"])(
    "carves %s with the topology mod off on the walls the mod on carves, its door plain ground",
    realisation => {
      const config = bound(onRouteSluiceFloor, realisation)
      const on = carved(config, TOPOLOGY_ON)
      const off = carved(config, TOPOLOGY_OFF)

      expect(barrierDoors(on).length).toBeGreaterThan(0)
      expect(dirsOf(off)).toBe(dirsOf(on))
      expect(barrierDoors(off)).toEqual([])
    }
  )

  it("declares water and sand as the topology mod's", () => {
    expect(["water", "sand"].map(id => resolveRegionBarrierRealisation(id))).toEqual([
      { id: "water", ownerMod: "topology", texture: "regionWater", fallback: "#2f6f86" },
      { id: "sand", ownerMod: "topology", texture: "regionSand", fallback: "#c9a45c" },
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
