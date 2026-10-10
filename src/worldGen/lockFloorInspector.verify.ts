import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { assembleInspectedFloor } from "../game/assembleInspectedFloor"
import { assembleFloor } from "../game/siteAssembler"
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
}, 600_000)

afterAll(() => {
  delete process.env.INCLUDE_DEV
})

describe("the journey inspector on lock floors", () => {
  // The inspector carries no family registry, so it refuses a floor that stands a switch before carving it
  // (`switchFamilyNotReEnterable`); such a floor is asked at the inspector's seed with the world's families.
  const assembles = ({ journeyId, pyramidNumber, floorIndex, floor }: LockFloor) => {
    const inspected = assembleInspectedFloor(journeyId, floor, INSPECTOR_SEED + pyramidNumber, floorIndex)
    if (inspected.success || !floor.switches) return inspected.success
    const refusedTheSwitch = inspected.reasons.every(reason => reason.type === "switchFamilyNotReEnterable")
    const seed = INSPECTOR_SEED + pyramidNumber + floorIndex
    return refusedTheSwitch && assembleFloor(journeyId, floor, seed, resolveEncounterMeta).success
  }

  it("assembles every lock floor the shipped world stands", () => {
    const shipped = lockFloors(plain)
    expect(shipped.map(({ journeyId, pyramidNumber, floorIndex }) => [journeyId, pyramidNumber, floorIndex])).toEqual([
      ["junior_1", 1, 0],
      ["junior_1", 2, 0],
      ["junior_1", 3, 0],
      ["junior_2", 2, 0],
      ["junior_2", 3, 0],
      ["junior_2", 4, 0],
      ["junior_3", 1, 0],
      ["junior_3", 2, 0],
      ["junior_3", 3, 0],
      ["junior_3", 4, 0],
      ["junior_4", 2, 0],
      ["junior_4", 3, 0],
      ["junior_4", 4, 0],
      ["junior_4", 5, 0],
      ["expert_1", 1, 0],
      ["expert_1", 2, 0],
      ["expert_1", 3, 0],
      ["expert_1", 4, 0],
      ["expert_2", 1, 0],
      ["expert_2", 2, 0],
      ["expert_2", 3, 0],
      ["expert_2", 4, 0],
      ["expert_3", 1, 0],
      ["expert_3", 2, 0],
      ["expert_3", 3, 0],
      ["expert_3", 4, 0],
      ["expert_3", 5, 0],
      ["expert_4", 1, 0],
      ["expert_4", 2, 0],
      ["expert_4", 3, 0],
      ["expert_4", 4, 0],
      ["expert_4", 5, 0],
    ])
    expect(shipped.filter(floor => !assembles(floor))).toEqual([])
  })

  it("assembles every lock floor the dev journey stands", () => {
    const dev = lockFloors({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] })
    expect(dev.map(({ pyramidNumber }) => pyramidNumber)).toEqual([2, 4, 10, 11, 12])
    expect(dev.filter(floor => !assembles(floor))).toEqual([])
  })
})
