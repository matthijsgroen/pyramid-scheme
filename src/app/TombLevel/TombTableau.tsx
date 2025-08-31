import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/game/generateRewardCalculation"
import { revealText } from "@/support/revealText"
import clsx from "clsx"
import { useMemo, type FC } from "react"
import type { Formula as FormulaType } from "@/app/Formulas/formulas"
import { Formula } from "../Formulas/Formula"
import type { FilledTileState } from "../Formulas/FormulaPart"
import { mulberry32, shuffle } from "@/game/random"
import { hashString } from "@/support/hashString"

// Helper function to count total number slots in a formula
const countFormulaSlots = (formula: FormulaType): number => {
  let count = 0
  if (typeof formula.left === "number") {
    // nothing to do
  } else if ("symbol" in formula.left) {
    count += 1
  } else {
    count += countFormulaSlots(formula.left)
  }
  if (typeof formula.right === "number") {
    // nothing to do
  } else if ("symbol" in formula.right) {
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
  onTileClick?: (symbolId: string, position: string) => void
}> = ({ difficulty, tableau, calculation, filledState, onTileClick }) => {
  // Calculate solved percentage based on filled tiles
  const solvedPercentage = useMemo(() => {
    // Count total slots across all formulas
    const totalSlots =
      calculation.hintFormulas.reduce((sum, formula) => sum + countFormulaSlots(formula), 0) +
      countFormulaSlots(calculation.mainFormula)

    // Count filled slots
    const filledSlots = Object.keys(filledState.filledPositions).length

    return totalSlots > 0 ? filledSlots / totalSlots : 0
  }, [calculation, filledState.filledPositions])

  const random = mulberry32(hashString(tableau.name))

  const hintFormulas =
    difficulty === "starter" || difficulty === "junior"
      ? calculation.hintFormulas.map((f, i) => ({ formula: f, index: i }))
      : shuffle(
          calculation.hintFormulas.map((f, i) => ({ formula: f, index: i })),
          random
        )
  return (
    <div
      className={clsx(
        "relative z-20 flex w-full max-w-md flex-col gap-4 rounded-lg border-t-4 p-4 text-slate-600 shadow-lg",
        hieroglyphLevelColors[difficulty]
      )}
    >
      <h1 className="text-center font-pyramid text-2xl">{revealText(tableau.name, solvedPercentage)}</h1>
      <div>{revealText(tableau.description, solvedPercentage)}</div>

      {hintFormulas.map(({ formula, index }, key) => (
        <div key={key} className="text-2xl">
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
      <div className="border-t border-black/20 pt-2">
        <span className="text-2xl">
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
