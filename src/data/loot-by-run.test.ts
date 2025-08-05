import { describe, it, expect } from "vitest"
import {
  getSymbolsForTombRun,
  getAllRunsForTomb,
  generateLootByRun,
} from "./loot-by-run"
import { generateTableaus } from "./tableaus"

const tableauLevels = generateTableaus()

describe("Loot By Run System", () => {
  const lootByRun = generateLootByRun(tableauLevels)

  describe("Basic Structure", () => {
    it("should have the correct tomb IDs", () => {
      const tombIds = Object.keys(lootByRun)
      expect(tombIds).toEqual([
        "starter_treasure_tomb",
        "junior_treasure_tomb",
        "expert_treasure_tomb",
        "master_treasure_tomb",
        "wizard_treasure_tomb",
      ])
    })

    it("should have correct number of runs for each tomb", () => {
      expect(lootByRun.starter_treasure_tomb).toHaveLength(4)
      expect(lootByRun.junior_treasure_tomb).toHaveLength(6)
      expect(lootByRun.expert_treasure_tomb).toHaveLength(8)
      expect(lootByRun.master_treasure_tomb).toHaveLength(10)
      expect(lootByRun.wizard_treasure_tomb).toHaveLength(12)
    })

    it("should have arrays of symbol arrays", () => {
      Object.values(lootByRun).forEach((tombRuns) => {
        expect(Array.isArray(tombRuns)).toBe(true)
        tombRuns.forEach((runSymbols) => {
          expect(Array.isArray(runSymbols)).toBe(true)
          expect(runSymbols.length).toBeGreaterThan(0)
          runSymbols.forEach((symbol) => {
            expect(typeof symbol).toBe("string")
          })
        })
      })
    })
  })

  describe("Symbol Organization", () => {
    it("should have sorted symbols in each run", () => {
      Object.values(lootByRun).forEach((tombRuns) => {
        tombRuns.forEach((runSymbols) => {
          const sorted = [...runSymbols].sort()
          expect(runSymbols).toEqual(sorted)
        })
      })
    })

    it("should have unique symbols in each run", () => {
      Object.values(lootByRun).forEach((tombRuns) => {
        tombRuns.forEach((runSymbols) => {
          const uniqueSymbols = [...new Set(runSymbols)]
          expect(runSymbols).toEqual(uniqueSymbols)
        })
      })
    })

    it("should only use symbols available to each tomb", () => {
      const symbolsByTomb = {
        starter_treasure_tomb: ["p10", "p8", "a6", "a8", "art1", "art5", "d1"],
        junior_treasure_tomb: [
          "p10",
          "p8",
          "a6",
          "a8",
          "art1",
          "art5",
          "d1",
          "p1",
          "p11",
          "p9",
          "a2",
          "a13",
          "art2",
          "art7",
          "art12",
          "d2",
          "d15",
        ],
        expert_treasure_tomb: [
          "p10",
          "p8",
          "a6",
          "a8",
          "art1",
          "art5",
          "d1",
          "p1",
          "p11",
          "p9",
          "a2",
          "a13",
          "art2",
          "art7",
          "art12",
          "d2",
          "d15",
          "p2",
          "p7",
          "p12",
          "a5",
          "a7",
          "a11",
          "art3",
          "art4",
          "art6",
          "art14",
          "d3",
          "d4",
          "d9",
        ],
        master_treasure_tomb: [
          "p10",
          "p8",
          "a6",
          "a8",
          "art1",
          "art5",
          "d1",
          "p1",
          "p11",
          "p9",
          "a2",
          "a13",
          "art2",
          "art7",
          "art12",
          "d2",
          "d15",
          "p2",
          "p7",
          "p12",
          "a5",
          "a7",
          "a11",
          "art3",
          "art4",
          "art6",
          "art14",
          "d3",
          "d4",
          "d9",
          "p4",
          "p5",
          "p14",
          "p15",
          "a1",
          "a3",
          "a14",
          "a15",
          "art9",
          "art10",
          "art11",
          "art15",
          "d5",
          "d6",
          "d10",
        ],
        wizard_treasure_tomb: [
          "p10",
          "p8",
          "a6",
          "a8",
          "art1",
          "art5",
          "d1",
          "p1",
          "p11",
          "p9",
          "a2",
          "a13",
          "art2",
          "art7",
          "art12",
          "d2",
          "d15",
          "p2",
          "p7",
          "p12",
          "a5",
          "a7",
          "a11",
          "art3",
          "art4",
          "art6",
          "art14",
          "d3",
          "d4",
          "d9",
          "p4",
          "p5",
          "p14",
          "p15",
          "a1",
          "a3",
          "a14",
          "a15",
          "art9",
          "art10",
          "art11",
          "art15",
          "d5",
          "d6",
          "d10",
          "p6",
          "p13",
          "a4",
          "a9",
          "a10",
          "a12",
          "d7",
          "d8",
          "d11",
          "d12",
          "d13",
          "d14",
        ],
      }

      Object.entries(lootByRun).forEach(([tombId, tombRuns]) => {
        const allowedSymbols =
          symbolsByTomb[tombId as keyof typeof symbolsByTomb]

        tombRuns.forEach((runSymbols) => {
          runSymbols.forEach((symbol) => {
            expect(allowedSymbols).toContain(symbol)
          })
        })
      })
    })
  })

  describe("Helper Functions", () => {
    it("getSymbolsForTombRun should return correct symbols", () => {
      // Test valid tomb and run
      const starterRun1 = getSymbolsForTombRun(
        "starter_treasure_tomb",
        1,
        tableauLevels
      )
      expect(starterRun1).toEqual(lootByRun.starter_treasure_tomb[0])

      const juniorRun3 = getSymbolsForTombRun(
        "junior_treasure_tomb",
        3,
        tableauLevels
      )
      expect(juniorRun3).toEqual(lootByRun.junior_treasure_tomb[2])

      // Test invalid inputs
      expect(getSymbolsForTombRun("invalid_tomb", 1, tableauLevels)).toEqual([])
      expect(
        getSymbolsForTombRun("starter_treasure_tomb", 0, tableauLevels)
      ).toEqual([])
      expect(
        getSymbolsForTombRun("starter_treasure_tomb", 999, tableauLevels)
      ).toEqual([])
    })

    it("getAllRunsForTomb should return all runs", () => {
      const starterRuns = getAllRunsForTomb(
        "starter_treasure_tomb",
        tableauLevels
      )
      expect(starterRuns).toEqual(lootByRun.starter_treasure_tomb)
      expect(starterRuns).toHaveLength(4)

      const expertRuns = getAllRunsForTomb(
        "expert_treasure_tomb",
        tableauLevels
      )
      expect(expertRuns).toEqual(lootByRun.expert_treasure_tomb)
      expect(expertRuns).toHaveLength(8)

      // Test invalid tomb
      expect(getAllRunsForTomb("invalid_tomb", tableauLevels)).toEqual([])
    })
  })
})
