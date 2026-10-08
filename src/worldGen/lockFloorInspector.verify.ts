import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { assembleInspectedFloor } from "../game/assembleInspectedFloor"
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

// The inspector story's default seed; its pyramid number is added on top.
const INSPECTOR_SEED = 42_195_837

const build = () =>
  buildConfigs(
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

type LockFloor = { journeyId: string; pyramidNumber: number; floorIndex: number; floor: GameFloorConfig }

const lockFloors = (configs: Record<string, SiteConfig[]>): LockFloor[] =>
  Object.entries(configs).flatMap(([journeyId, sites]) =>
    sites.flatMap((site, siteIndex) =>
      site.flatMap((floor, floorIndex) =>
        floor.locks?.length
          ? [{ journeyId, pyramidNumber: siteIndex + 1, floorIndex, floor: floor as GameFloorConfig }]
          : []
      )
    )
  )

let plain: Record<string, SiteConfig[]>
let withDev: Record<string, SiteConfig[]>

beforeAll(() => {
  delete process.env.INCLUDE_DEV
  plain = build()
  process.env.INCLUDE_DEV = "1"
  withDev = build()
  delete process.env.INCLUDE_DEV
}, 180_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

describe("the journey inspector on lock floors", () => {
  const assembles = ({ journeyId, pyramidNumber, floorIndex, floor }: LockFloor) =>
    assembleInspectedFloor(journeyId, floor, INSPECTOR_SEED + pyramidNumber, floorIndex).success

  it("assembles the shipped world's lock floor, expert pyramid 4's first floor", () => {
    const shipped = lockFloors(plain)
    expect(shipped.map(({ journeyId, pyramidNumber, floorIndex }) => [journeyId, pyramidNumber, floorIndex])).toEqual([
      ["expert_1", 4, 0],
    ])
    expect(shipped.map(assembles)).toEqual([true])
  })

  it("assembles every lock floor the dev journey stands", () => {
    const dev = lockFloors({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] })
    expect(dev.map(({ pyramidNumber }) => pyramidNumber)).toEqual([2, 4, 10, 11, 12])
    expect(dev.filter(floor => !assembles(floor))).toEqual([])
  })
})
