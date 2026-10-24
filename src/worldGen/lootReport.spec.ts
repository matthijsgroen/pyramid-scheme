import { describe, expect, it } from "vitest"
import { buildLootReport, renderLootReportMarkdown, type LootTotal } from "./lootReport"
import type { ResolveEncounter } from "@/game/siteAssembler"
import type { Difficulty, FloorConfig, SideSection, SiteConfig, SubSection } from "./types"

const SHOP_ENCOUNTER = "made-up-shop"
const resolveEncounter: ResolveEncounter = (encounter, defaultTag) => {
  const id = Array.isArray(encounter) ? encounter[0] : encounter
  if (id === SHOP_ENCOUNTER || defaultTag === "shop") return { familyId: "shop-family", tags: ["shop"] }
  return { familyId: "puzzle-family", tags: ["puzzle"] }
}

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})
const side = (overrides: Partial<SideSection> = {}): SideSection => ({
  pathPuzzles: 0,
  difficulty: "starter",
  end: "treasure",
  ...overrides,
})
const sub = (overrides: Partial<SubSection> = {}): SubSection => ({ ...side(), ...overrides })

const money = { type: "money", amount: 5 }
const skin = { type: "waterskin" }
const gem = { type: "gem" }

const build = (
  configs: Record<string, SiteConfig[]>,
  totals: LootTotal[] = [],
  tiers: Record<string, Difficulty> = {}
) => buildLootReport(configs, { resolveEncounter, totals, journeyTier: id => tiers[id] })

const tierRow = (report: ReturnType<typeof build>, tier: Difficulty) => report.byTier.find(r => r.tier === tier)!

describe("buildLootReport", () => {
  it("counts a floor's puzzle rooms, those with loot, and the empty ones", () => {
    const report = build({ a: [[floor({ pathPuzzles: 3, rewards: [money, undefined, skin], mainEndReward: gem })]] })
    const row = tierRow(report, "starter")
    expect(row.puzzleRooms).toBe(3)
    expect(row.puzzlesWithLoot).toBe(2)
    expect(row.emptyPuzzleRooms).toBe(1)
    expect(row.share).toBeCloseTo(2 / 3)
    expect(row.rewardTypes.puzzle).toEqual({ money: 1, waterskin: 1 })
    expect(row.rewardTypes.chest).toEqual({ gem: 1 })
  })

  it("makes the main-path end a chest on an exit or none floor, and no slot on a staircase floor", () => {
    const report = build({
      a: [[floor({ exitOrStaircase: "exit", mainEndReward: gem })], [floor({ exitOrStaircase: "none" })]],
      b: [[floor({ exitOrStaircase: "staircase" })]],
    })
    expect(report.slots.filter(s => s.kind === "chest").map(s => [s.journeyId, s.levelNr])).toEqual([
      ["a", 1],
      ["a", 2],
    ])
    expect(tierRow(report, "starter").chests).toEqual({ filled: 1, total: 2 })
  })

  it("makes a side section ending in treasure a path end, sub-sections included, and nothing for a staircase end", () => {
    const report = build({
      a: [
        [
          floor({
            exitOrStaircase: "staircase",
            sideSections: [
              side({ end: "treasure", endReward: gem, sideSections: [sub({ end: "treasure" })] }),
              side({ end: "staircase" }),
              side({ end: { stairId: "x" } }),
            ],
          }),
        ],
      ],
    })
    expect(report.slots.map(s => [s.kind, s.place])).toEqual([
      ["pathEnd", "side 1"],
      ["pathEnd", "side 1.1"],
    ])
  })

  it("marks a hidden section's slots hidden, its sub-sections' too", () => {
    const report = build({
      a: [
        [
          floor({
            exitOrStaircase: "staircase",
            sideSections: [side({ hidden: true, pathPuzzles: 1, sideSections: [sub()] }), side()],
          }),
        ],
      ],
    })
    expect(report.slots.map(s => [s.place, s.hidden])).toEqual([
      ["side 1 #1", true],
      ["side 1", true],
      ["side 1.1", true],
      ["side 2", false],
    ])
  })

  it("reads a section the resolver calls the shop as stock, filled or not, with no rooms and no end", () => {
    const report = build({
      a: [
        [
          floor({
            exitOrStaircase: "staircase",
            sideSections: [side({ encounter: SHOP_ENCOUNTER, pathPuzzles: 4, rewards: [gem, undefined, money] })],
          }),
        ],
      ],
    })
    const stock = report.slots.filter(s => s.kind === "shopStock")
    expect(stock.map(s => [s.place, s.reward !== undefined])).toEqual([
      ["side 1 #1", true],
      ["side 1 #2", false],
      ["side 1 #3", true],
    ])
    expect(report.slots.some(s => s.kind === "puzzle" || s.kind === "pathEnd")).toBe(false)
    const row = tierRow(report, "starter")
    expect(row.shopStock).toEqual({ filled: 2, total: 3 })
    expect(row.puzzleRooms).toBe(0)
    expect(row.rewardTypes.shopStock).toEqual({ gem: 1, money: 1 })
    expect(report.unrewardedEnds).toEqual([])
  })

  it("tiers a puzzle room by its section, and keeps the level under its journey", () => {
    const report = build(
      {
        a: [
          [
            floor({
              difficulty: "starter",
              sideSections: [side({ difficulty: "junior", pathPuzzles: 2, rewards: [money] })],
            }),
          ],
        ],
      },
      [],
      { a: "starter" }
    )
    expect(tierRow(report, "junior").puzzleRooms).toBe(2)
    expect(tierRow(report, "starter").puzzleRooms).toBe(0)
    expect(report.byLevel).toHaveLength(1)
    expect(report.byLevel[0]).toMatchObject({ journeyId: "a", levelNr: 1, tier: "starter", puzzleRooms: 2 })
  })

  it("lists a chest or path end without a reward as unrewarded, outside the filled counts", () => {
    const report = build({
      a: [[floor({ mainEndReward: gem, sideSections: [side(), side({ endReward: money })] })], [floor()]],
    })
    expect(report.unrewardedEnds.map(s => [s.levelNr, s.kind, s.place])).toEqual([
      [1, "pathEnd", "side 1"],
      [2, "chest", "main"],
    ])
    expect(tierRow(report, "starter").chests).toEqual({ filled: 1, total: 2 })
    expect(tierRow(report, "starter").pathEnds).toEqual({ filled: 1, total: 2 })
  })

  it("reports a share of 0 for a tier with no puzzle rooms", () => {
    const report = build({ a: [[floor()]] })
    expect(tierRow(report, "wizard").share).toBe(0)
    expect(report.byLevel[0].share).toBe(0)
  })

  it("walks journeys in the given order, floors then side sections", () => {
    const report = build({ b: [[floor({ pathPuzzles: 1 })]], a: [[floor({ pathPuzzles: 1 })]] })
    expect(report.slots.filter(s => s.kind === "puzzle").map(s => s.journeyId)).toEqual(["b", "a"])
    expect(report.byLevel.map(l => l.journeyId)).toEqual(["b", "a"])
  })

  it("passes totals through in order, setting short or surplus only where needed is", () => {
    const report = build({}, [
      { label: "Under", found: 3, needed: 5 },
      { label: "Over", found: 7, needed: 5 },
      { label: "Exact", found: 5, needed: 5 },
      { label: "No demand", found: 9 },
    ])
    expect(report.totals).toEqual([
      { label: "Under", found: 3, needed: 5, short: 2 },
      { label: "Over", found: 7, needed: 5, surplus: 2 },
      { label: "Exact", found: 5, needed: 5 },
      { label: "No demand", found: 9 },
    ])
  })
})

describe("renderLootReportMarkdown", () => {
  const report = build(
    { a: [[floor({ difficulty: "junior", pathPuzzles: 2, rewards: [money], mainEndReward: gem })]] },
    [{ label: "Coins", found: 5, needed: 9, unit: "coins" }],
    { a: "junior" }
  )

  it("is the same string for the same report twice", () => {
    expect(renderLootReportMarkdown(report)).toBe(renderLootReportMarkdown(report))
  })

  it("holds every heading and says so when there are no unrewarded ends", () => {
    const md = renderLootReportMarkdown(report)
    for (const heading of [
      "# Loot report",
      "## Totals against demand",
      "## Per tier",
      "## Per journey",
      "## Loot ends without a reward in the spec",
    ])
      expect(md).toContain(heading)
    expect(md).toContain("yarn loot-report")
    expect(md).toContain("None.")
    expect(md).toContain("money 1")
  })

  it("lists unrewarded ends instead of None.", () => {
    const md = renderLootReportMarkdown(build({ a: [[floor()]] }))
    expect(md).not.toContain("None.")
  })

  it("holds no date or time it was not given", () => {
    const md = renderLootReportMarkdown(report)
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(md).not.toMatch(/\d{1,2}:\d{2}/)
  })
})
