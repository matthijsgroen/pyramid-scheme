import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { expandFloorLocks } from "../game/floorLocks"
import { layLockPlan, startingGridSize } from "../game/layLocks"
import { planLockFloor } from "../game/lockPlan"
import { expectLaidPlan } from "../game/testSupport/laidLocksInvariants"
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

describe("laying the dev pyramid's doubleBack plan", () => {
  it(
    "lays on at least one of 200 seeds, with its junction, drops, walls and route intact",
    { timeout: 400_000 },
    () => {
      const floor = Object.entries(world)
        .filter(([id]) => id === DEV_JOURNEY_ID)
        .flatMap(([, sites]) => sites.flat() as unknown as GameFloorConfig[])
        .find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
      const expanded = expandFloorLocks(floor)
      if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
      const plan = planLockFloor(expanded)!
      const laidSeeds = Array.from({ length: 200 }, (_, i) => i + 1).flatMap(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        if (!result.ok) return []
        expectLaidPlan(plan, result.laid)
        return [seed]
      })
      expect(laidSeeds.length).toBeGreaterThanOrEqual(1)
    }
  )
})
