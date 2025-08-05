/**
 * Loot distribution data for treasure tomb runs.
 * This file maps each tomb run to the symbols required for that specific run,
 * making it easier to distribute loot and manage inventory requirements.
 */

import { tableauLevels } from "./tableaus"

export type TombRunLoot = {
  tombId: string
  tombName: string
  runNumber: number
  levelCount: number
  symbolsPerTableau: number
  requiredSymbols: string[]
  tableauRange: {
    start: number
    end: number
  }
}

export type TombLootDistribution = {
  tombId: string
  tombName: string
  totalRuns: number
  symbolsPerTableau: number
  runs: TombRunLoot[]
}

// Generate loot distribution data
function generateLootDistribution(): TombLootDistribution[] {
  const tombConfig = [
    {
      id: "starter_treasure_tomb",
      name: "Forgotten Merchant's Cache",
      totalRuns: 4,
      levelsPerRun: 2,
      symbolsPerTableau: 2,
    },
    {
      id: "junior_treasure_tomb",
      name: "Noble's Hidden Vault",
      totalRuns: 6,
      levelsPerRun: 3,
      symbolsPerTableau: 3,
    },
    {
      id: "expert_treasure_tomb",
      name: "High Priest's Treasury",
      totalRuns: 8,
      levelsPerRun: 4,
      symbolsPerTableau: 4,
    },
    {
      id: "master_treasure_tomb",
      name: "Pharaoh's Secret Hoard",
      totalRuns: 10,
      levelsPerRun: 5,
      symbolsPerTableau: 5,
    },
    {
      id: "wizard_treasure_tomb",
      name: "Vault of the Gods",
      totalRuns: 12,
      levelsPerRun: 6,
      symbolsPerTableau: 6,
    },
  ]

  const lootDistribution: TombLootDistribution[] = []

  for (const tomb of tombConfig) {
    const tombTableaux = tableauLevels.filter(
      (t) => t.tombJourneyId === tomb.id
    )
    const runs: TombRunLoot[] = []

    for (let runNumber = 1; runNumber <= tomb.totalRuns; runNumber++) {
      const runTableaux = tombTableaux.filter((t) => t.runNumber === runNumber)

      // Collect all unique symbols required for this run
      const allSymbols = new Set<string>()
      runTableaux.forEach((tableau) => {
        tableau.inventoryIds.forEach((symbolId) => {
          allSymbols.add(symbolId)
        })
      })

      // Calculate tableau range for this run
      const startIndex = tombTableaux.findIndex(
        (t) => t.runNumber === runNumber
      )
      const endIndex = startIndex + tomb.levelsPerRun - 1

      runs.push({
        tombId: tomb.id,
        tombName: tomb.name,
        runNumber,
        levelCount: tomb.levelsPerRun,
        symbolsPerTableau: tomb.symbolsPerTableau,
        requiredSymbols: Array.from(allSymbols).sort(),
        tableauRange: {
          start: tombTableaux[startIndex].levelNr,
          end: tombTableaux[endIndex].levelNr,
        },
      })
    }

    lootDistribution.push({
      tombId: tomb.id,
      tombName: tomb.name,
      totalRuns: tomb.totalRuns,
      symbolsPerTableau: tomb.symbolsPerTableau,
      runs,
    })
  }

  return lootDistribution
}

export const lootDistribution = generateLootDistribution()

// Helper functions for easy access
export function getRequiredSymbolsForRun(
  tombId: string,
  runNumber: number
): string[] {
  const tomb = lootDistribution.find((t) => t.tombId === tombId)
  if (!tomb) return []

  const run = tomb.runs.find((r) => r.runNumber === runNumber)
  return run ? run.requiredSymbols : []
}

export function getAllSymbolsForTomb(tombId: string): string[] {
  const tomb = lootDistribution.find((t) => t.tombId === tombId)
  if (!tomb) return []

  const allSymbols = new Set<string>()
  tomb.runs.forEach((run) => {
    run.requiredSymbols.forEach((symbol) => allSymbols.add(symbol))
  })

  return Array.from(allSymbols).sort()
}

export function getTombRunInfo(
  tombId: string,
  runNumber: number
): TombRunLoot | undefined {
  const tomb = lootDistribution.find((t) => t.tombId === tombId)
  if (!tomb) return undefined

  return tomb.runs.find((r) => r.runNumber === runNumber)
}

// Export summary data for quick reference
export const tombSummary = lootDistribution.map((tomb) => ({
  tombId: tomb.tombId,
  tombName: tomb.tombName,
  totalRuns: tomb.totalRuns,
  symbolsPerTableau: tomb.symbolsPerTableau,
  totalUniqueSymbols: getAllSymbolsForTomb(tomb.tombId).length,
  avgSymbolsPerRun: Math.round(
    tomb.runs.reduce((sum, run) => sum + run.requiredSymbols.length, 0) /
      tomb.runs.length
  ),
}))
