import { describe, expect, it } from "vitest"
import { assignFragments, buildPlacementInfos, collectSlots } from "./fragments"
import { PYRAMID_JOURNEYS } from "./data"
import type { FloorConfig, SiteConfig } from "./types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

describe("collectSlots", () => {
  const anyPyramidId = PYRAMID_JOURNEYS[0].id

  it("collects a fragmentSlot on the main path", () => {
    const configs = { [anyPyramidId]: [[floor({ mainEndReward: { type: "fragmentSlot" } })]] as SiteConfig[] }
    const slots = collectSlots(configs)
    expect(slots).toHaveLength(1)
    expect(slots[0].isPlaceholder).toBe(true)
  })

  it("collects a fragmentSlot in a side section, recording its ward gate", () => {
    const configs = {
      [anyPyramidId]: [
        [
          floor({
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "starter",
                end: "treasure",
                gate: { type: "tomb-key", wardKeyId: "w1" },
                endReward: { type: "fragmentSlot" },
              },
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    const slots = collectSlots(configs)
    expect(slots).toHaveLength(1)
    expect(slots[0].wardKeys).toEqual(["w1"])
  })

  it("collects an open (unassigned) ward gate as a non-placeholder slot", () => {
    const configs = {
      [anyPyramidId]: [
        [
          floor({
            sideSections: [
              { pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "w1" } },
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    const slots = collectSlots(configs)
    expect(slots).toHaveLength(1)
    expect(slots[0].isPlaceholder).toBe(false)
  })

  it("ignores sites that aren't pyramid journeys (e.g. tombs)", () => {
    const configs = { not_a_pyramid: [[floor({ mainEndReward: { type: "fragmentSlot" } })]] as SiteConfig[] }
    expect(collectSlots(configs)).toEqual([])
  })
})

describe("buildPlacementInfos", () => {
  it("returns one entry per unique hieroglyph, each with a required count", () => {
    const infos = buildPlacementInfos()
    const ids = infos.map(i => i.hieroglyphId)
    expect(new Set(ids).size).toBe(ids.length) // no duplicates
    expect(infos.every(i => i.required > 0)).toBe(true)
  })
})

describe("assignFragments", () => {
  it("fills fragmentSlot sentinels with hieroglyphFragment rewards", () => {
    const anyPyramidId = PYRAMID_JOURNEYS[0].id
    const f = floor({ mainEndReward: { type: "fragmentSlot" } })
    const configs = { [anyPyramidId]: [[f]] as SiteConfig[] }
    assignFragments(configs)
    expect(f.mainEndReward?.type).toBe("hieroglyphFragment")
  })

  it("falls back to a consumable when a placeholder slot goes unused", () => {
    // Way more slots than total real-world fragment demand — the surplus falls back to consumables.
    const floors = Array.from({ length: 1000 }, () => floor({ mainEndReward: { type: "fragmentSlot" } }))
    const configs = { [PYRAMID_JOURNEYS[0].id]: [floors] as SiteConfig[] }
    assignFragments(configs)
    const types = new Set(floors.map(f => f.mainEndReward?.type))
    expect(types.has("consumable")).toBe(true)
  })
})
