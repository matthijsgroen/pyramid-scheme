import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { expandFloorLocks } from "../game/floorLocks"
import { regionRoute } from "../game/regions"
import { planLockFloor } from "../game/lockPlan"
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

// The real world with the dev journey in it, built the way devJourney.verify.ts builds it.
let world: Record<string, SiteConfig[]>

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  world = buildConfigs(
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
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const floorsOf = (journeyId?: string): GameFloorConfig[] =>
  Object.entries(world)
    .filter(([id]) => journeyId === undefined || id === journeyId)
    .flatMap(([, sites]) => sites.flat()) as unknown as GameFloorConfig[]

const planOf = (floor: GameFloorConfig) => {
  const expanded = expandFloorLocks(floor)
  if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
  return planLockFloor(expanded)
}

describe("the plan of the dev pyramid's doubleBack floor", () => {
  it("plans the catalogue doubleBack: its regions, corridors and drops between the floor's entrance and exit", () => {
    const floor = floorsOf(DEV_JOURNEY_ID).find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
    const expanded = expandFloorLocks(floor)
    if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
    const plan = planOf(floor)!
    const layout = expanded.config.regionLayout!
    expect(plan.route).toEqual(regionRoute(layout))
    expect(plan.regions.map(region => region.id)).toEqual(layout.regions.map(region => region.name))
    expect(plan.corridors.map(corridor => [corridor.from, corridor.to])).toEqual(layout.connections)
    expect(plan.drops).toEqual(
      Object.entries(floor.locks![0].lock.oneWays ?? {}).map(([id, { from, to }]) => ({
        id: `doubleBack.${id}`,
        launch: `doubleBack.${from}`,
        landing: `doubleBack.${to}`,
      }))
    )
    expect(plan.junctions.map(junction => junction.control)).toEqual(["doubleBack.Y"])
  })
})

describe("a floor without locks has no plan", () => {
  it("holds for every floor of the real world that places none", () => {
    const unlocked = floorsOf().filter(floor => (floor.locks ?? []).length === 0)
    expect(unlocked.length).toBeGreaterThan(100)
    expect(unlocked.filter(floor => planOf(floor) !== undefined)).toEqual([])
  })

  it("gives every floor that places locks a plan, so the sweep above is not vacuous", () => {
    expect(
      floorsOf()
        .filter(floor => (floor.locks ?? []).length > 0)
        .every(floor => planOf(floor) !== undefined)
    ).toBe(true)
  })
})
