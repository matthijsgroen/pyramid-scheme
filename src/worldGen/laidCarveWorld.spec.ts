import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig, SideSection } from "../game/siteTypes"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "../game/floorLockWalk"
import { ALL_CURRENCY_DISTRIBUTIONS } from "../mods/allCurrencyDistributions"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  REGISTERED_MOD_IDS,
} from "../mods/registeredMods"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "../mods/allFamilyMeta"
import {
  CARVE_FAULT_TYPES,
  carveOnce,
  expectCarveAgrees,
  expectCarveReadsLaid,
  expectContentFitsAppetite,
  expectForkSwitchRoom,
  expectNoWayRoundADoor,
  expectRouteIsWholeRoute,
} from "../game/testSupport/laidCarveChecks"
import type { LaidCarve } from "../game/testSupport/laidCarveChecks"

let devDoubleBack: FloorConfig

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  const world: Record<string, SiteConfig[]> = buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    0,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta
  )
  devDoubleBack = (world[DEV_JOURNEY_ID] ?? [])
    .flatMap(site => site as unknown as FloorConfig[])
    .find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const path = (pathPuzzles: number, more: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles,
  difficulty: "expert",
  end: "treasure",
  ...more,
})
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

// The dev pyramid's own doubleBack, without the pinned packing and seed that its ballast side paths needed.
const authored = (sideSections: SideSection[]): FloorConfig => ({
  ...devDoubleBack,
  sideSections,
  packing: undefined,
  seed: undefined,
})

const carve = (floor: FloorConfig): LaidCarve[] =>
  SEEDS.map(seed => carveOnce(DEV_JOURNEY_ID, floor, seed, resolveEncounterMeta, { resolveKeyRequirements }))

// What each variant authors, and how many seeds of 40 it must carve on the first attempt.
const VARIANTS: Record<string, { make: () => FloorConfig; minimum: number }> = {
  "without any side path": { make: () => authored([]), minimum: 30 },
  "with a couple of ordinary side paths": { make: () => authored([path(1), path(0)]), minimum: 30 },
  "with two ungated side paths of puzzles and a reward": { make: () => authored([path(2), path(1)]), minimum: 30 },
  "with one ungated and one floor-key-gated side path": {
    make: () => authored([path(2), path(1, { gate: { type: "floor-key" } })]),
    minimum: 20,
  },
}

describe("the dev pyramid's doubleBack is carved from the structure laid for it", { timeout: 300_000 }, () => {
  for (const [name, { make, minimum }] of Object.entries(VARIANTS))
    describe(name, () => {
      let carves: LaidCarve[]
      beforeAll(() => {
        carves = carve(make())
      }, 240_000)
      // A check over the carves that did not carve would pass for nothing, so every one asks for the rate first.
      const carved = () => {
        const found = carves.flatMap(result => (result.ok ? [result] : []))
        expect(found.length, `${name} carves`).toBeGreaterThanOrEqual(minimum)
        return found
      }

      it(`carves on the first attempt at ${minimum} of 40 seeds at least, every one sound with no dead region`, () => {
        expect(carved().length).toBeGreaterThanOrEqual(minimum)
        for (const { grid } of carved()) {
          const walk = walkFloorLock(grid)!
          if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
          expect(deadFloorRegions(grid)).toEqual([])
        }
      })

      it("reads route, arms, junction, drops and regions off the laid floor, and runs its main path the whole route", () => {
        for (const { grid, laid } of carved()) {
          expectCarveReadsLaid(grid, laid)
          expectRouteIsWholeRoute(grid, make(), laid)
        }
      })

      it("never joins two regions the lock keeps apart nor goes round a door, and never meets a carve fault", () => {
        carved()
        for (const result of carves) {
          if (!result.ok) expect(result.reasons.filter(reason => CARVE_FAULT_TYPES.has(reason.type))).toEqual([])
          else {
            expectCarveAgrees(result.grid, make())
            expectNoWayRoundADoor(result.grid, result.laid)
            expectContentFitsAppetite(result.grid, make())
          }
        }
      })

      it("stands an ungated side path's rooms on laid nodes in walk order and leaves a gated one a branch", () => {
        const sides = make().sideSections
        for (const { grid, laid } of carved()) {
          const filled = sides.flatMap((side, i) => (side.gate === undefined ? [i] : []))
          expect(laid.absorbed.map(({ section }) => section)).toEqual(filled)
          for (const { section, cells } of laid.absorbed) {
            const own = grid.cells.flatMap((row, r) =>
              row.flatMap((cell, c) =>
                (cell.type === "room" || cell.type === "corridor") && cell.sectionAddress === `s${section}`
                  ? [`${r},${c}`]
                  : []
              )
            )
            expect(own.sort()).toEqual([...cells].sort())
            const depths = cells.map(key => laid.depth.get(key)!)
            expect(depths).toEqual([...depths].sort((a, b) => a - b))
          }
          sides.forEach((side, i) => {
            if (side.gate === undefined) return
            const branch = grid.cells.flatMap((row, r) =>
              row.flatMap((cell, c) =>
                (cell.type === "room" || cell.type === "corridor") && cell.sectionAddress === `s${i}`
                  ? [`${r},${c}`]
                  : []
              )
            )
            expect(branch.length).toBeGreaterThan(1)
            for (const key of branch) expect(laid.label.has(key)).toBe(false)
          })
        }
      })

      it("stands Y on the lightbeam family with rest and one state for each of its two seams", () => {
        for (const { grid } of carved()) {
          const junction = expectForkSwitchRoom(grid, "lightbeamSwitch")
          expect(junction.mechanismId).toBe("doubleBack.Y")
          expect(junction.exits!.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
        }
      })
    })
})
