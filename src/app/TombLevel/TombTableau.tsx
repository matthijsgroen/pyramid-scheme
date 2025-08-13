import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/game/generateRewardCalculation"
import { revealText } from "@/support/revealText"
import clsx from "clsx"
import { useMemo, type FC } from "react"
import type { Formula as FormulaType } from "@/game/formulas"
import { Formula } from "./Formula"
import type { FilledTileState } from "./FormulaPart"

// Helper function to count total number slots in a formula
const countFormulaSlots = (formula: FormulaType): number => {
  let count = 0
  if (typeof formula.left === "number") {
    count += 1
  } else {
    count += countFormulaSlots(formula.left)
  }
  if (typeof formula.right === "number") {
    count += 1
  } else {
    count += countFormulaSlots(formula.right)
  }
  return count
}

export const TombTableau: FC<{
  difficulty: Difficulty
  tableau: TableauLevel
  calculation: RewardCalculation
  filledState: FilledTileState
  onTileClick: (symbolId: string, position: string) => void
}> = ({ difficulty, tableau, calculation, filledState, onTileClick }) => {
  // Calculate solved percentage based on filled tiles
  const solvedPercentage = useMemo(() => {
    // Count total slots across all formulas
    const totalSlots =
      calculation.hintFormulas.reduce(
        (sum, formula) => sum + countFormulaSlots(formula),
        0
      ) + countFormulaSlots(calculation.mainFormula)

    // Count filled slots
    const filledSlots = Object.keys(filledState.filledPositions).length

    return totalSlots > 0 ? filledSlots / totalSlots : 0
  }, [calculation, filledState.filledPositions])

  return (
    <div
      className={clsx(
        "relative z-20 flex w-full max-w-md flex-col gap-4 rounded-lg border-t-4 p-4 text-slate-500 shadow-lg",
        hieroglyphLevelColors[difficulty]
      )}
    >
      <h1 className="text-center font-pyramid text-2xl">
        {revealText(tableau.name, solvedPercentage)}
      </h1>
      <div>{revealText(tableau.description, solvedPercentage)}</div>

      {calculation.hintFormulas.map((formula, index) => (
        <div key={index} className="text-3xl">
          <Formula
            formula={formula}
            showResult={true}
            difficulty={difficulty}
            symbolMapping={calculation.symbolMapping}
            filledState={filledState}
            onTileClick={onTileClick}
            formulaIndex={index}
          />
        </div>
      ))}
      <div>
        <span className="text-4xl">
          <Formula
            formula={calculation.mainFormula}
            showResult={false}
            difficulty={difficulty}
            symbolMapping={calculation.symbolMapping}
            filledState={filledState}
            onTileClick={onTileClick}
            formulaIndex={calculation.hintFormulas.length}
          />
        </span>
      </div>
    </div>
  )
}
