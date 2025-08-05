import { describe, it, expect } from "vitest"
import {
  lootDistribution,
  getRequiredSymbolsForRun,
  getAllSymbolsForTomb,
  getTombRunInfo,
  tombSummary,
} from "./loot-distribution"
import { tableauLevels } from "./tableaus"

describe("Loot Distribution System", () => {
  describe("Basic Structure", () => {
    it("should have data for all 5 tombs", () => {
      expect(lootDistribution).toHaveLength(5)

      const tombIds = lootDistribution.map((t) => t.tombId)
      expect(tombIds).toEqual([
        "starter_treasure_tomb",
        "junior_treasure_tomb",
        "expert_treasure_tomb",
        "master_treasure_tomb",
        "wizard_treasure_tomb",
      ])
    })

    it("should have correct run counts for each tomb", () => {
      const expectedRuns = [4, 6, 8, 10, 12]

      lootDistribution.forEach((tomb, index) => {
        expect(tomb.totalRuns).toBe(expectedRuns[index])
        expect(tomb.runs).toHaveLength(expectedRuns[index])
      })
    })

    it("should have correct symbols per tableau for each tomb", () => {
      const expectedSymbolCounts = [2, 3, 4, 5, 6]

      lootDistribution.forEach((tomb, index) => {
        expect(tomb.symbolsPerTableau).toBe(expectedSymbolCounts[index])
      })
    })
  })

  describe("Run-specific Data", () => {
    it("should have correct tableau ranges for starter tomb runs", () => {
      const starterTomb = lootDistribution.find(
        (t) => t.tombId === "starter_treasure_tomb"
      )!

      // Starter tomb: 4 runs × 2 levels = 8 tableaux total (levels 1-8)
      expect(starterTomb.runs[0].tableauRange).toEqual({ start: 1, end: 2 }) // Run 1
      expect(starterTomb.runs[1].tableauRange).toEqual({ start: 3, end: 4 }) // Run 2
      expect(starterTomb.runs[2].tableauRange).toEqual({ start: 5, end: 6 }) // Run 3
      expect(starterTomb.runs[3].tableauRange).toEqual({ start: 7, end: 8 }) // Run 4
    })

    it("should have correct tableau ranges for junior tomb runs", () => {
      const juniorTomb = lootDistribution.find(
        (t) => t.tombId === "junior_treasure_tomb"
      )!

      // Junior tomb: 6 runs × 3 levels = 18 tableaux total (levels 9-26)
      expect(juniorTomb.runs[0].tableauRange).toEqual({ start: 9, end: 11 }) // Run 1
      expect(juniorTomb.runs[1].tableauRange).toEqual({ start: 12, end: 14 }) // Run 2
      expect(juniorTomb.runs[5].tableauRange).toEqual({ start: 24, end: 26 }) // Run 6
    })

    it("should have required symbols for each run", () => {
      lootDistribution.forEach((tomb) => {
        tomb.runs.forEach((run) => {
          expect(run.requiredSymbols).toBeDefined()
          expect(run.requiredSymbols.length).toBeGreaterThan(0)
          expect(Array.isArray(run.requiredSymbols)).toBe(true)

          // Symbols should be sorted
          const sorted = [...run.requiredSymbols].sort()
          expect(run.requiredSymbols).toEqual(sorted)
        })
      })
    })

    it("should have correct level counts per run", () => {
      const expectedLevelCounts = [2, 3, 4, 5, 6] // starter, junior, expert, master, wizard

      lootDistribution.forEach((tomb, tombIndex) => {
        tomb.runs.forEach((run) => {
          expect(run.levelCount).toBe(expectedLevelCounts[tombIndex])
        })
      })
    })
  })

  describe("Symbol Requirements", () => {
    it("should only use symbols available to each tomb", () => {
      // Define progressive symbol access using the actual data
      const symbolsByTomb = {
        starter_treasure_tomb: getAllSymbolsForTomb("starter_treasure_tomb"),
        junior_treasure_tomb: getAllSymbolsForTomb("junior_treasure_tomb"),
        expert_treasure_tomb: getAllSymbolsForTomb("expert_treasure_tomb"),
        master_treasure_tomb: getAllSymbolsForTomb("master_treasure_tomb"),
        wizard_treasure_tomb: getAllSymbolsForTomb("wizard_treasure_tomb"),
      }

      lootDistribution.forEach((tomb) => {
        const allowedSymbols =
          symbolsByTomb[tomb.tombId as keyof typeof symbolsByTomb]

        tomb.runs.forEach((run) => {
          run.requiredSymbols.forEach((symbol) => {
            expect(allowedSymbols).toContain(symbol)
          })
        })
      })
    })

    it("should match the actual tableau data", () => {
      lootDistribution.forEach((tomb) => {
        const tombTableaux = tableauLevels.filter(
          (t) => t.tombJourneyId === tomb.tombId
        )

        tomb.runs.forEach((run) => {
          const runTableaux = tombTableaux.filter(
            (t) => t.runNumber === run.runNumber
          )

          // Collect actual symbols from tableaux
          const actualSymbols = new Set<string>()
          runTableaux.forEach((tableau) => {
            tableau.inventoryIds.forEach((symbol) => actualSymbols.add(symbol))
          })

          // Should match the loot distribution data
          expect(run.requiredSymbols).toEqual(Array.from(actualSymbols).sort())
        })
      })
    })
  })

  describe("Helper Functions", () => {
    it("getRequiredSymbolsForRun should return correct symbols", () => {
      const starterRun1Symbols = getRequiredSymbolsForRun(
        "starter_treasure_tomb",
        1
      )
      expect(starterRun1Symbols).toBeDefined()
      expect(starterRun1Symbols.length).toBeGreaterThan(0)

      // Should return empty array for invalid tomb/run
      expect(getRequiredSymbolsForRun("invalid_tomb", 1)).toEqual([])
      expect(getRequiredSymbolsForRun("starter_treasure_tomb", 999)).toEqual([])
    })

    it("getAllSymbolsForTomb should return all unique symbols", () => {
      const starterSymbols = getAllSymbolsForTomb("starter_treasure_tomb")
      expect(starterSymbols).toBeDefined()
      expect(starterSymbols.length).toBeGreaterThan(0)

      // Should be sorted
      const sorted = [...starterSymbols].sort()
      expect(starterSymbols).toEqual(sorted)

      // Should return empty array for invalid tomb
      expect(getAllSymbolsForTomb("invalid_tomb")).toEqual([])
    })

    it("getTombRunInfo should return correct run data", () => {
      const starterRun1 = getTombRunInfo("starter_treasure_tomb", 1)
      expect(starterRun1).toBeDefined()
      expect(starterRun1!.runNumber).toBe(1)
      expect(starterRun1!.tombId).toBe("starter_treasure_tomb")
      expect(starterRun1!.levelCount).toBe(2)

      // Should return undefined for invalid tomb/run
      expect(getTombRunInfo("invalid_tomb", 1)).toBeUndefined()
      expect(getTombRunInfo("starter_treasure_tomb", 999)).toBeUndefined()
    })
  })

  describe("Tomb Summary", () => {
    it("should have summary data for all tombs", () => {
      expect(tombSummary).toHaveLength(5)

      tombSummary.forEach((summary) => {
        expect(summary.tombId).toBeDefined()
        expect(summary.tombName).toBeDefined()
        expect(summary.totalRuns).toBeGreaterThan(0)
        expect(summary.symbolsPerTableau).toBeGreaterThan(0)
        expect(summary.totalUniqueSymbols).toBeGreaterThan(0)
        expect(summary.avgSymbolsPerRun).toBeGreaterThan(0)
      })
    })

    it("should have correct total runs in summary", () => {
      const expectedRuns = [4, 6, 8, 10, 12]

      tombSummary.forEach((summary, index) => {
        expect(summary.totalRuns).toBe(expectedRuns[index])
      })
    })
  })

  describe("Data Consistency", () => {
    it("should have increasing symbol complexity across tombs", () => {
      for (let i = 1; i < tombSummary.length; i++) {
        const previous = tombSummary[i - 1]
        const current = tombSummary[i]

        // Each tomb should have more symbols per tableau than the previous
        expect(current.symbolsPerTableau).toBeGreaterThan(
          previous.symbolsPerTableau
        )

        // Each tomb should have more total unique symbols available
        expect(current.totalUniqueSymbols).toBeGreaterThan(
          previous.totalUniqueSymbols
        )
      }
    })

    it("should have all run numbers present for each tomb", () => {
      lootDistribution.forEach((tomb) => {
        const runNumbers = tomb.runs
          .map((run) => run.runNumber)
          .sort((a, b) => a - b)
        const expectedNumbers = Array.from(
          { length: tomb.totalRuns },
          (_, i) => i + 1
        )
        expect(runNumbers).toEqual(expectedNumbers)
      })
    })
  })
})
