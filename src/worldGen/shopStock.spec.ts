import { describe, expect, it } from "vitest"
import { assembleFloor, defaultResolveEncounter } from "../game/siteAssembler"
import type { ResolveEncounter } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { gridShape } from "./layoutCheck"
import { clearShopEnds, placeShopStock, trimEmptyStock } from "./shopStock"
import type { SiteConfig } from "./types"

// A made-up resolver: "made-up-stall" is the shop, everything else answers as itself.
const resolve: ResolveEncounter = (encounter, tag) => {
  const id = (Array.isArray(encounter) ? encounter[0] : encounter) ?? tag
  return { familyId: id === "made-up-stall" ? "fez-shop" : id, tags: [], ownerMod: "made-up" }
}

const siteWithShop = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        encounter: "made-up-stall",
        endReward: { type: "fragmentSlot" },
      },
      { pathPuzzles: 0, difficulty: "starter", end: "treasure", endReward: { type: "fragmentSlot" } },
    ],
  },
]

describe(clearShopEnds, () => {
  it("a shop's end placeholder is cleared before the layout", () => {
    const site = siteWithShop()
    clearShopEnds({ made_up: [site] }, resolve)
    expect(site[0].sideSections[0].endReward).toBeUndefined()
    expect(site[0].sideSections[1].endReward).toEqual({ type: "fragmentSlot" })
  })

  it("refuses an authored reward on a shop end, naming the section", () => {
    const site = siteWithShop()
    site[0].sideSections[0].endReward = { type: "mosaicPiece", tier: "starter" }
    expect(() => clearShopEnds({ made_up: [site] }, resolve)).toThrow(
      "authored endReward on a shop end: made_up:0 floor 0 s0"
    )
  })

  it("refuses one on a shop that ends a sub-section", () => {
    const site = siteWithShop()
    site[0].sideSections[1].sideSections = [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        encounter: "made-up-stall",
        endReward: { type: "mosaicPiece", tier: "starter" },
      },
    ]
    expect(() => clearShopEnds({ made_up: [site] }, resolve)).toThrow(
      "authored endReward on a shop end: made_up:0 floor 0 s1.0"
    )
  })
})

const shopFloor = (rewards: GameFloorConfig["sideSections"][number]["rewards"]): GameFloorConfig => ({
  pathPuzzles: 2,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", encounter: "fez-shop", rewards }],
})

describe(trimEmptyStock, () => {
  it("a shop keeps only its assigned stock", () => {
    const floor = shopFloor([undefined, undefined, undefined])
    const configs: Record<string, SiteConfig[]> = { made_up: [[floor]] }
    placeShopStock(configs, [{ journeyId: "made_up", prefers: "made-up-bucket" }])
    trimEmptyStock(configs, defaultResolveEncounter)
    expect(floor.sideSections[0].rewards).toEqual([{ type: "fragmentSlot", prefers: "made-up-bucket" }])
  })

  it("asks the injected resolver which section is the shop", () => {
    const floor = shopFloor([undefined, { type: "fragmentSlot", prefers: "made-up-bucket" }])
    floor.sideSections[0].encounter = "made-up-stall"
    trimEmptyStock({ made_up: [[floor]] }, resolve)
    expect(floor.sideSections[0].rewards).toEqual([{ type: "fragmentSlot", prefers: "made-up-bucket" }])
  })

  it("leaves a puzzle chain's empty reward positions alone", () => {
    const floor = shopFloor([undefined])
    floor.rewards = [undefined, undefined]
    trimEmptyStock({ made_up: [[floor]] }, defaultResolveEncounter)
    expect(floor.rewards).toEqual([undefined, undefined])
  })

  it("trimming moves no wall", () => {
    const untrimmed = shopFloor([{ type: "fragmentSlot", prefers: "made-up-bucket" }, undefined, undefined])
    const trimmed = structuredClone(untrimmed)
    trimEmptyStock({ made_up: [[trimmed]] }, defaultResolveEncounter)
    expect(trimmed.sideSections[0].rewards).toEqual([{ type: "fragmentSlot", prefers: "made-up-bucket" }])
    const carve = (config: GameFloorConfig, seed: number): FloorGrid | null => {
      const result = assembleFloor("made_up", { ...config, seed }, seed, defaultResolveEncounter)
      return result.success ? result.grid : null
    }
    const seeds = Array.from({ length: 10 }, (_, n) => (n + 1) * 7919).filter(seed => carve(untrimmed, seed) !== null)
    expect(seeds.length).toBeGreaterThan(0)
    for (const seed of seeds) expect(gridShape(carve(trimmed, seed)!)).toBe(gridShape(carve(untrimmed, seed)!))
  })
})

describe(placeShopStock, () => {
  const world = (rewards: GameFloorConfig["sideSections"][number]["rewards"]): Record<string, SiteConfig[]> => ({
    made_up: [[shopFloor(rewards)]],
  })

  it("a piece for a missing or full shop is dropped, unless it is required", () => {
    const full = world([{ type: "fragmentSlot", prefers: "made-up-other" }])
    placeShopStock(full, [{ journeyId: "made_up", prefers: "made-up-bucket" }])
    placeShopStock(full, [{ journeyId: "made_up", prefers: "made-up-bucket", nth: 1 }])
    expect(full.made_up[0][0].sideSections[0].rewards).toEqual([{ type: "fragmentSlot", prefers: "made-up-other" }])
  })

  it("a required piece for a full shop is refused, naming the piece and the shop", () => {
    expect(() =>
      placeShopStock(world([{ type: "fragmentSlot", prefers: "made-up-other" }]), [
        { journeyId: "made_up", prefers: "made-up-key", required: true },
      ])
    ).toThrow("shop stock: made-up-key is sold at shop 0 of made_up, which is full")
  })

  it("a required piece for a shop that does not exist is refused, naming the piece and the shop", () => {
    expect(() =>
      placeShopStock(world([undefined]), [{ journeyId: "made_up", prefers: "made-up-key", nth: 1, required: true }])
    ).toThrow("shop stock: made-up-key is sold at shop 1 of made_up, which does not exist")
    expect(() =>
      placeShopStock(world([undefined]), [{ journeyId: "made-up-elsewhere", prefers: "made-up-key", required: true }])
    ).toThrow("shop stock: made-up-key is sold at shop 0 of made-up-elsewhere, which does not exist")
  })
})
