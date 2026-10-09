import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { DEV_JOURNEY_ID } from "./data"
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
  it("lists the parts the designer's drawing shows: a route, a junction with its two seams, the drops and each region's seats", () => {
    const floor = floorsOf(DEV_JOURNEY_ID).find(candidate => candidate.locks?.[0]?.lock.name === "doubleBack")!
    expect(planOf(floor)).toEqual({
      route: ["entrance", "doubleBack.in", "doubleBack.out", "exit"],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "doubleBack.in",
          owner: "doubleBack",
          onRoute: true,
          seats: [{ for: "junction", control: "doubleBack.Y" }],
          minNodes: 1,
        },
        {
          id: "doubleBack.leftLower",
          owner: "doubleBack",
          onRoute: false,
          mouth: "doubleBack.in",
          seats: [],
          minNodes: 1,
        },
        {
          id: "doubleBack.rightLower",
          owner: "doubleBack",
          onRoute: false,
          mouth: "doubleBack.in",
          seats: [],
          minNodes: 1,
        },
        {
          id: "doubleBack.s1",
          owner: "doubleBack",
          onRoute: false,
          mouth: "doubleBack.in",
          seats: [{ for: "control", control: "doubleBack.S1" }],
          minNodes: 1,
        },
        {
          id: "doubleBack.s2",
          owner: "doubleBack",
          onRoute: false,
          mouth: "doubleBack.in",
          seats: [{ for: "control", control: "doubleBack.S2" }],
          minNodes: 1,
        },
        { id: "doubleBack.out", owner: "doubleBack", onRoute: true, seats: [], minNodes: 1 },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        {
          id: "entrance>doubleBack.in",
          from: "entrance",
          to: "doubleBack.in",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "doubleBack.in>doubleBack.leftLower",
          from: "doubleBack.in",
          to: "doubleBack.leftLower",
          onRoute: false,
          barriers: ["doubleBack.in-leftLower"],
          minNodes: 0,
        },
        {
          id: "doubleBack.in>doubleBack.rightLower",
          from: "doubleBack.in",
          to: "doubleBack.rightLower",
          onRoute: false,
          barriers: ["doubleBack.in-rightLower"],
          minNodes: 0,
        },
        {
          id: "doubleBack.rightLower>doubleBack.s1",
          from: "doubleBack.rightLower",
          to: "doubleBack.s1",
          onRoute: false,
          barriers: ["doubleBack.rightLower-s1"],
          minNodes: 0,
        },
        {
          id: "doubleBack.leftLower>doubleBack.s2",
          from: "doubleBack.leftLower",
          to: "doubleBack.s2",
          onRoute: false,
          barriers: ["doubleBack.leftLower-s2"],
          minNodes: 0,
        },
        {
          id: "doubleBack.in>doubleBack.out",
          from: "doubleBack.in",
          to: "doubleBack.out",
          onRoute: true,
          barriers: ["doubleBack.in-out"],
          minNodes: 0,
        },
        { id: "doubleBack.out>exit", from: "doubleBack.out", to: "exit", onRoute: true, barriers: [], minNodes: 0 },
      ],
      junctions: [
        {
          region: "doubleBack.in",
          control: "doubleBack.Y",
          arms: ["doubleBack.in>doubleBack.leftLower", "doubleBack.in>doubleBack.rightLower"],
        },
      ],
      drops: Object.entries(floor.locks![0].lock.oneWays ?? {}).map(([id, { from, to }]) => ({
        id: `doubleBack.${id}`,
        launch: `doubleBack.${from}`,
        landing: `doubleBack.${to}`,
      })),
      nested: [],
    })
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
