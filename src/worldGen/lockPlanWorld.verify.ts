import { beforeAll, describe, expect, it } from "vitest"
import { pinsFrom } from "../mods/buildWorldConfigs"
import { generatedWorldConfigs } from "../data/generatedWorld"
import { buildConfigs } from "./configBuilder"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { expandFloorLocks } from "../game/floorLocks"
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

// The real world, built the way the bake builds it.
let world: Record<string, SiteConfig[]>

beforeAll(() => {
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
    resolveEncounterMeta,
    undefined,
    { pickLayout: pinsFrom(generatedWorldConfigs) }
  )
}, 180_000)

const floorsOf = (journeyId?: string): GameFloorConfig[] =>
  Object.entries(world)
    .filter(([id]) => journeyId === undefined || id === journeyId)
    .flatMap(([, sites]) => sites.flat()) as unknown as GameFloorConfig[]

const planOf = (floor: GameFloorConfig) => {
  const expanded = expandFloorLocks(floor)
  if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
  return planLockFloor(expanded)
}

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
