import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { expandFloorLocks } from "../game/floorLocks"
import { mirrorForkLock } from "../game/testSupport/lockFixtures"
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

// A made-up mirrorFork on the dev pyramid's doubleBack floor: the lay rate is measured on a lock that lays well,
// so a regression in the lay shows as a drop below the bar. doubleBack itself is carved at its pinned seed in
// laidCarveWorld.verify.
describe("laying a mirrorFork plan on the dev pyramid's doubleBack floor", () => {
  it(
    "lays on at least 30 of 40 seeds, each with its junction, drops, walls and route intact",
    { timeout: 120_000 },
    () => {
      const devFloor = Object.entries(world)
        .filter(([id]) => id === DEV_JOURNEY_ID)
        .flatMap(([, sites]) => sites.flat() as unknown as GameFloorConfig[])
        .find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
      const expanded = expandFloorLocks({ ...devFloor, locks: [{ lock: mirrorForkLock() }] })
      if (!expanded.ok) throw new Error(`refused: ${JSON.stringify(expanded.reasons)}`)
      const plan = planLockFloor(expanded)!
      const laidSeeds = Array.from({ length: 40 }, (_, i) => i + 1).flatMap(seed => {
        const result = layLockPlan(plan, { seed, n: startingGridSize(plan) })
        if (!result.ok) return []
        expectLaidPlan(plan, result.laid)
        return [seed]
      })
      expect(laidSeeds.length).toBeGreaterThanOrEqual(30)
    }
  )
})
