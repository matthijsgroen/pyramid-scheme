import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { buildConfigs } from "./configBuilder"
import { collectSlots } from "./slots"
import { findEmptyChests } from "./validate"
import { DEV_JOURNEY_ID } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"
import { assembleFloor } from "../game/siteAssembler"
// worldGen's FloorConfig is a looser mirror of game/siteTypes.ts's, and authored data only ever
// assigns values the stricter type accepts too — the same cast reachability.ts makes to assemble.
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { floorAssemblySeed, persistentInteriorSeed } from "../game/siteSeed"
// Same sanctioned exception configBuilder.integration.spec.ts takes: the claim here is about the
// REAL, complete world, which only the real mod-owned currencies can build.
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

// Mirrors scripts/generateWorld.ts's own call arg-for-arg (EMPTY_FRACTION 0 included), economy guard
// and all: a dev journey that quietly earned the player money would move `guaranteedIncome`, and that
// is one of the things this file is here to catch.
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

const rewardsOf = (configs: Record<string, SiteConfig[]>): TreasureReward[] => {
  const out: TreasureReward[] = []
  const add = (r: TreasureReward | undefined) => {
    if (r) out.push(r)
  }
  const addAll = (rs: (TreasureReward | undefined)[] | undefined) => rs?.forEach(add)
  for (const sites of Object.values(configs)) {
    for (const floors of sites) {
      for (const floor of floors) {
        add(floor.mainEndReward)
        addAll(floor.rewards)
        for (const section of floor.sideSections) {
          add(section.endReward)
          addAll(section.rewards)
          for (const sub of section.sideSections ?? []) {
            add(sub.endReward)
            addAll(sub.rewards)
          }
        }
      }
    }
  }
  return out
}

const tally = (rewards: readonly TreasureReward[], key: (r: TreasureReward) => string): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const r of rewards) counts[key(r)] = (counts[key(r)] ?? 0) + 1
  return counts
}

const byCurrency = (configs: Record<string, SiteConfig[]>) => tally(rewardsOf(configs), r => r.type)

const mosaicByTier = (configs: Record<string, SiteConfig[]>) =>
  tally(
    rewardsOf(configs).filter(r => r.type === "mosaicPiece"),
    r => `${r.tier}`
  )

const withoutDev = (configs: Record<string, SiteConfig[]>): Record<string, SiteConfig[]> =>
  Object.fromEntries(Object.entries(configs).filter(([id]) => id !== DEV_JOURNEY_ID))

const devFloors = (configs: Record<string, SiteConfig[]>): FloorConfig[] =>
  (configs[DEV_JOURNEY_ID] ?? []).flatMap(site => site)

// Two complete world builds, and the comparison between them is the point of the file — so both are
// paid for once here rather than by whichever test happens to run first. Budget: a single build runs
// well under 30s, and everything below reads these two.
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

describe("the dev journey's place in the generated world", () => {
  // Everything below compares two worlds; if the second one never grew the dev journey, every
  // comparison would pass while proving nothing at all.
  it("is built only when INCLUDE_DEV is set", () => {
    expect(plain[DEV_JOURNEY_ID]).toBeUndefined()
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(6)
  })

  it("leaves every other journey exactly as it was", () => {
    expect(JSON.stringify(withoutDev(withDev))).toBe(JSON.stringify(plain))
  })
})

describe("the loot the dev journey contributes", () => {
  it("is none: not one reward is placed anywhere on it", () => {
    expect(rewardsOf({ [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] })).toEqual([])
  })

  it("is none the solver could have placed either: it offers no slot", () => {
    // Counted first: a world with no dev journey would filter an empty list and prove nothing.
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(6)
    const devSlots = collectSlots(withDev, familyPriorityFor).filter(s => s.journeyId === DEV_JOURNEY_ID)
    expect(devSlots).toEqual([])
  })

  it("moves no currency's placed count", () => {
    expect(byCurrency(withDev)).toEqual(byCurrency(plain))
  })

  it("moves no mosaic tier's placed count", () => {
    expect(mosaicByTier(withDev)).toEqual(mosaicByTier(plain))
  })

  // Its chests hold nothing on purpose, and findEmptyChests knows a site outside the loot economy
  // has nothing to fill them with — so it reports none of them and the generator does not stop.
  it("leaves no empty chest for the generator to refuse", () => {
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(6)
    const empties = findEmptyChests(
      { [DEV_JOURNEY_ID]: withDev[DEV_JOURNEY_ID] },
      (journeyId, floor, levelNr, floorIndex) => {
        const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
        const result = assembleFloor(journeyId, floor as GameFloorConfig, seed, resolveEncounterMeta, {
          resolveKeyRequirements,
          floorRef: { journeyId, floorIndex },
        })
        return result.success ? result.grid : null
      }
    )
    expect(empties).toEqual([])
  })
})

describe("what the dev journey authors", () => {
  it("gives each topology feature a floor of its own, spread across four tiers", () => {
    expect(devFloors(withDev).map(f => f.difficulty)).toEqual([
      "junior",
      "junior",
      "expert",
      "expert",
      "master",
      "wizard",
    ])
  })

  it("stands a switch in a reserved junction on every one of them", () => {
    // Counted first, so a world that grew no dev journey fails here rather than walking an empty list.
    expect(devFloors(withDev)).toHaveLength(6)
    for (const floor of devFloors(withDev)) {
      expect(floor.forks).toEqual([{ exits: 2, count: 1 }])
      expect(floor.switches).toEqual({ encounter: "lightbeamSwitch", min: 1, max: 1 })
    }
  })

  // The map-piece branch and the ward gate are auto-injected onto ordinary pyramids by position, and
  // a dev site sits at a position that would earn both. Its capability preset is what keeps them off
  // it, so the count of side sections is exactly the two the spec authors.
  it("grows none of the branches the real economies inject by position", () => {
    expect(devFloors(withDev)).toHaveLength(6)
    for (const floor of devFloors(withDev)) expect(floor.sideSections).toHaveLength(2)
  })

  it("carves every one of them at the seed the runtime hands it", () => {
    expect(withDev[DEV_JOURNEY_ID]).toHaveLength(6)
    const failed: string[] = []
    withDev[DEV_JOURNEY_ID].forEach((site, levelIndex) =>
      site.forEach((floor, floorIndex) => {
        const seed = floorAssemblySeed(persistentInteriorSeed(DEV_JOURNEY_ID), levelIndex + 1, floorIndex)
        const result = assembleFloor(DEV_JOURNEY_ID, floor as GameFloorConfig, seed, resolveEncounterMeta, {
          resolveKeyRequirements,
          floorRef: { journeyId: DEV_JOURNEY_ID, floorIndex },
        })
        if (!result.success) failed.push(`level ${levelIndex + 1} floor ${floorIndex}`)
      })
    )
    expect(failed).toEqual([])
  })
})
