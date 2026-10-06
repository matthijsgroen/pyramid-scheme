import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig } from "./types"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
import { floorLock } from "../game/floorLock"
import { authoredByCompiled, authoredPairOf, failureOf, withoutLayout } from "./regionPassages.testing"
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
})

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

const assembleDevAt = (floor: FloorConfig, levelNr: number, floorIndex: number): FloorGrid | null => {
  const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelNr, floorIndex)
  const result = assembleFloor(DEV_JOURNEY_ID, floor as GameFloorConfig, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex },
  })
  return result.success ? result.grid : null
}

describe("regions the author wrote separately", () => {
  it("stay separate on the dev pyramid's bare mouth, hall and vault, joined by a passage each", () => {
    const grid = assembleDevAt(dev[0][0], 1, 0)!
    const held = authoredByCompiled(grid)
    const lock = floorLock(grid)!

    for (const authored of held.values()) expect(authored.size).toBe(1)
    expect([...new Set([...held.values()].map(set => [...set].join()))].sort()).toEqual(["hall", "mouth", "vault"])
    expect([...new Set((lock.passages ?? []).map(({ a, b }) => authoredPairOf(held, a, b)))].sort()).toEqual([
      "hall|mouth",
      "hall|vault",
    ])
  })
})

describe("compiling regions apart", () => {
  it("leaves the verdict of every dev journey floor as it was with the regions flooded together", () => {
    let walked = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleDevAt(floor, levelIndex + 1, floorIndex)
        const lock = grid && floorLock(grid)
        if (!grid || !lock) return
        walked++
        expect(failureOf(lock), `level ${levelIndex + 1} floor ${floorIndex}`).toBe(
          failureOf(floorLock(withoutLayout(grid))!)
        )
      })
    )
    expect(walked).toBeGreaterThanOrEqual(9)
  })

  it("compiles every dev floor with no layout to exactly the lock it compiled to before, with no passage", () => {
    let walked = 0
    dev.forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        // A floor placing locks carries the layout those locks compile into, so it authors one all the same.
        if ((floor as GameFloorConfig).regionLayout || floor.locks?.length) return
        const grid = assembleDevAt(floor, levelIndex + 1, floorIndex)
        const lock = grid && floorLock(grid)
        if (!grid || !lock) return
        walked++
        expect(lock.passages).toBeUndefined()
        expect(lock).toEqual(floorLock(withoutLayout(grid)))
      })
    )
    expect(walked).toBeGreaterThan(0)
  })
})
