import { describe, expect, it } from "vitest"
import { sluiceLock } from "../game/testSupport/lockFixtures"
import { defaultResolveEncounter } from "../game/siteAssembler"
import type { ResolveEncounter } from "../game/siteAssembler"
import { buildConfigs, buildTombConfigsFor, type AuthoredWorld } from "./configBuilder"
import { journey, tomb } from "./dsl"
import type { Distribution } from "./slotAllocator"
import type { SiteConfig, SubSection, TombJourneyDef, TreasureReward } from "./types"

const madeUpTomb = (levelCount: number): TombJourneyDef => ({ id: "t", tier: "starter", floorCount: 1, levelCount })

describe("buildTombConfigsFor", () => {
  it("builds one site per tomb level, the tomb's rules on the last", () => {
    const configs = buildTombConfigsFor(
      [madeUpTomb(2)],
      [
        journey("t").pyramid("first", { floors: [{ pathPuzzles: 2, encounter: "puzzle" }] }),
        tomb("t", { encounter: "tomb-puzzle", floorCount: 1, floors: [{ mainEndReward: "tombTreasure" }] }),
      ]
    )
    expect(configs.t).toHaveLength(2)
    expect(configs.t[0][0].encounter).toBe("puzzle")
    expect(configs.t[0][0].sideSections.some(s => s.gate?.type === "tomb-key")).toBe(false)
    expect(configs.t[1][0].encounter).toBe("tomb-puzzle")
  })

  it("refuses an earlier level that authors no floors", () => {
    expect(() => buildTombConfigsFor([madeUpTomb(2)], [tomb("t", { floorCount: 1 })])).toThrow(/must author its floors/)
  })

  it("passes an authored tomb floor's locks and difficulty through", () => {
    const configs = buildTombConfigsFor(
      [madeUpTomb(1)],
      [
        tomb("t", {
          floorCount: 1,
          floors: [{ difficulty: "junior", locks: [{ lock: sluiceLock() }], realisations: { toggle: "handle" } }],
        }),
      ]
    )
    expect(configs.t[0][0].difficulty).toBe("junior")
    expect(configs.t[0][0].locks).toHaveLength(1)
    expect(configs.t[0][0].realisations).toBeDefined()
  })
})

// A made-up world: one starter pyramid of one floor, a shop and a chest off its main path.
const madeUpWorld: AuthoredWorld = {
  journeys: [{ id: "starter_1", tier: "starter", pathPuzzles: 2, levelCount: 1 }],
  tombs: [],
  spec: [
    journey("starter_1", {
      floors: [{ pathPuzzles: 2, sideSections: [{ pathPuzzles: 0, encounter: "shop" }, { pathPuzzles: 1 }] }],
    }),
  ],
}
const resolve: ResolveEncounter = (encounter, tag) => ({
  ...defaultResolveEncounter(encounter, tag),
  ownerMod: "made-up",
})
const sectionsOf = (configs: Record<string, SiteConfig[]>): SubSection[] =>
  Object.values(configs).flatMap(sites =>
    sites.flatMap(site => site.flatMap(floor => floor.sideSections.flatMap(s => [s, ...(s.sideSections ?? [])])))
  )
const rewardsOf = (configs: Record<string, SiteConfig[]>): TreasureReward[] =>
  Object.values(configs)
    .flatMap(sites => sites.flatMap(site => site))
    .flatMap(floor => [
      floor.mainEndReward,
      ...(floor.rewards ?? []),
      ...sectionsOf({ x: [[floor]] }).flatMap(s => [s.endReward, ...(s.rewards ?? [])]),
    ])
    .filter((r): r is TreasureReward => r !== undefined)

describe("buildConfigs' layout stage", () => {
  it("the layout hook sees the world before any loot", () => {
    let distributed = 0
    const spy: Distribution = {
      id: "made-up-loot",
      footprint: () => {
        distributed++
        return { min: 0, max: 0 }
      },
      fill: () => {
        distributed++
      },
    }
    let seen: { distributed: number; rewards: TreasureReward[]; shop: SubSection | undefined } | undefined
    // The made-up world holds none of the shipped world's reward totals, so the build stops once placement is done.
    const stopAfterPlacement = () => {
      throw new Error("placement done")
    }
    const build = () =>
      buildConfigs(
        undefined,
        [],
        [],
        [spy],
        [stopAfterPlacement],
        undefined,
        0,
        (role, _tier, _seed, count) => Array.from({ length: count }, () => (role === "shop" ? "fez-shop" : role)),
        undefined,
        undefined,
        encounter => (encounter === "fez-shop" ? 3 : 1),
        [{ journeyId: "starter_1", prefers: "made-up-bucket" }],
        undefined,
        undefined,
        undefined,
        resolve,
        undefined,
        {
          world: madeUpWorld,
          pickLayout: configs => {
            seen = {
              distributed,
              rewards: rewardsOf(configs).map(r => ({ ...r })),
              shop: structuredClone(sectionsOf(configs).find(s => s.encounter === "fez-shop")),
            }
          },
        }
      )
    expect(build).toThrow("placement done")
    expect(seen).toBeDefined()
    expect(seen!.distributed).toBe(0)
    expect(seen!.rewards.length).toBeGreaterThan(0)
    expect(seen!.rewards.filter(r => r.type !== "fragmentSlot")).toEqual([])
    expect(seen!.shop?.endReward).toBeUndefined()
    expect(seen!.shop?.rewards).toEqual([{ type: "fragmentSlot", prefers: "made-up-bucket" }])
    expect(distributed).toBeGreaterThan(0)
  })
})
