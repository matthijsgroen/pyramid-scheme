/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { type FC } from "react"
import { registerPuzzle } from "@/game/puzzleRegistry"
import { mulberry32 } from "@/game/random"
import { generateRewardCalculation, type RewardCalculation } from "@/game/generateRewardCalculation"
import type { PuzzleSettings } from "@/game/puzzlePlugin"
import type { Operation } from "@/app/Formulas/formulas"
import { TombPuzzle } from "@/app/TombLevel/TombPuzzle"
import type { TableauLevel } from "@/data/tableaus"

const TOMB_SYMBOLS: Record<string, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: ["p1", "p11", "p9", "a2", "a13", "art2", "art7", "art12", "d2", "d15"],
  expert: ["p2", "p3", "p7", "p12", "a5", "a7", "a11", "art3", "art4", "art6", "art14", "d3", "d4", "d9"],
  master: ["p4", "p5", "p14", "p15", "a1", "a3", "a14", "a15", "art9", "art10", "art11", "art15", "d5", "d6", "d10"],
  wizard: ["p6", "p13", "a4", "a9", "a10", "a12", "d7", "d8", "d11", "d12", "d13", "d14"],
}

type TableauConfig = {
  symbolCount: number
  numberRange: [number, number]
  operators: Operation[]
  maxMultiplyOperandResult?: number
}

const TABLEAU_CONFIG: Record<string, TableauConfig> = {
  starter: { symbolCount: 2, numberRange: [1, 5], operators: ["+"] },
  junior: { symbolCount: 3, numberRange: [1, 10], operators: ["+", "-"] },
  expert: { symbolCount: 4, numberRange: [1, 10], operators: ["+", "-", "*"], maxMultiplyOperandResult: 5 },
  master: { symbolCount: 4, numberRange: [1, 10], operators: ["+", "-", "*"], maxMultiplyOperandResult: 8 },
  wizard: { symbolCount: 5, numberRange: [1, 20], operators: ["+", "-", "*"], maxMultiplyOperandResult: 10 },
}

const TableauComponent: FC<{ puzzle: RewardCalculation; settings: PuzzleSettings; onSolved: () => void }> = ({
  puzzle,
  settings,
  onSolved,
}) => {
  const difficulty = settings.difficulty ?? "starter"
  const dummyTableau: TableauLevel = {
    id: "plugin",
    levelNr: 1,
    symbolCount: Object.keys(puzzle.symbolCounts).length,
    inventoryIds: Object.values(puzzle.symbolMapping),
    tombJourneyId: "plugin",
    runNumber: 1,
    name: "",
    description: "",
  }
  return <TombPuzzle tableau={dummyTableau} calculation={puzzle} difficulty={difficulty} onComplete={onSolved} />
}

registerPuzzle({
  family: "tableau",
  generate: (seed, settings): RewardCalculation => {
    const difficulty = settings.difficulty ?? "starter"
    const config = TABLEAU_CONFIG[difficulty] ?? TABLEAU_CONFIG.starter
    const symbols = TOMB_SYMBOLS[difficulty] ?? TOMB_SYMBOLS.starter
    const random = mulberry32(seed)
    return generateRewardCalculation(
      {
        amountSymbols: config.symbolCount,
        hieroglyphIds: symbols,
        numberRange: config.numberRange,
        operations: config.operators,
        maxMultiplyOperandResult: config.maxMultiplyOperandResult,
      },
      random
    )
  },
  Component: TableauComponent as FC<{ puzzle: unknown; settings: PuzzleSettings; onSolved: () => void }>,
})
