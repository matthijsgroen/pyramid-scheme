import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
import { floorLock } from "../game/floorLock"
import { deadFloorRegions, walkFloorLock } from "../game/floorLockWalk"
import { deadRegions, walkLock } from "../game/lockWalk"
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

let dev: SiteConfig[]

beforeAll(() => {
  process.env.INCLUDE_DEV = "1"
  dev = buildConfigs(
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
  )[DEV_JOURNEY_ID]
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

describe("the dev journey's floors, none of them nested", () => {
  it("are walked over their whole lock exactly as before nesting existed, on every dev floor", () => {
    expect(dev).toHaveLength(9)
    let walked = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelIndex + 1, floorIndex)
        const result = assembleFloor(DEV_JOURNEY_ID, floor as GameFloorConfig, seed, resolveEncounterMeta, {
          resolveKeyRequirements,
          floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex },
        })
        expect(result.success, `level ${levelIndex + 1} floor ${floorIndex} carves`).toBe(true)
        if (!result.success) return
        const lock = floorLock(result.grid)
        expect(result.grid.lockNesting, `level ${levelIndex + 1}`).toBeUndefined()
        expect(walkFloorLock(result.grid), `level ${levelIndex + 1}`).toEqual(lock && walkLock(lock))
        expect(deadFloorRegions(result.grid), `level ${levelIndex + 1}`).toEqual(lock ? deadRegions(lock) : [])
        if (lock) walked++
      })
    )
    expect(walked).toBeGreaterThanOrEqual(9)
  })
})
