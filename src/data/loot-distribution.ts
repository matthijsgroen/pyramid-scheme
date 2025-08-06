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
  symbolCounts: Record<string, number> // NEW: track how many times each symbol is used
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
