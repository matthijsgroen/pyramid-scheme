/**
 * Simple loot distribution by tomb and run.
 * Format: { tombId: [[run1_symbols], [run2_symbols], ...] }
 */

import { type TableauLevel } from "./tableaus"

export type LootByRun = Record<string, string[][]>

// Generate the simple loot distribution format
export function generateLootByRun(tableauLevels: TableauLevel[]): LootByRun {
  const result: LootByRun = {}

  const tombConfig = [
    { id: "starter_treasure_tomb", totalRuns: 4 },
    { id: "junior_treasure_tomb", totalRuns: 6 },
    { id: "expert_treasure_tomb", totalRuns: 8 },
    { id: "master_treasure_tomb", totalRuns: 10 },
    { id: "wizard_treasure_tomb", totalRuns: 12 },
  ]

  for (const tomb of tombConfig) {
    const tombTableaux = tableauLevels.filter(
      (t) => t.tombJourneyId === tomb.id
    )
    const runs: string[][] = []

    for (let runNumber = 1; runNumber <= tomb.totalRuns; runNumber++) {
      const runTableaux = tombTableaux.filter((t) => t.runNumber === runNumber)

      // Collect all unique symbols for this run
      const runSymbols = new Set<string>()
      runTableaux.forEach((tableau) => {
        tableau.inventoryIds.forEach((symbolId) => {
          runSymbols.add(symbolId)
        })
      })

      runs.push(Array.from(runSymbols).sort())
    }

    result[tomb.id] = runs
  }

  return result
}

// Helper functions for easy access
export function getSymbolsForTombRun(
  tombId: string,
  runNumber: number,
  tableauLevels: TableauLevel[]
): string[] {
  const lootData = generateLootByRun(tableauLevels)
  const tombRuns = lootData[tombId]
  if (!tombRuns || runNumber < 1 || runNumber > tombRuns.length) {
    return []
  }
  return tombRuns[runNumber - 1] // Convert to 0-based index
}

export function getAllRunsForTomb(
  tombId: string,
  tableauLevels: TableauLevel[]
): string[][] {
  const lootData = generateLootByRun(tableauLevels)
  return lootData[tombId] || []
}
