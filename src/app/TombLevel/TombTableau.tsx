import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/game/generateRewardCalculation"
import { revealText } from "@/support/revealText"
import clsx from "clsx"
import { useMemo, useState, type FC } from "react"
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
  scribesEyeSlots?: number // 0/undefined = off; Infinity = unlimited
}> = ({ difficulty, tableau, calculation, filledState, onTileClick, scribesEyeSlots = 0 }) => {
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

  const [annotations, setAnnotations] = useState<Record<string, string>>({})

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
      {scribesEyeSlots > 0 && (
        <div className="border-t border-black/20 pt-2">
          <p className="mb-1 text-xs opacity-60">📜 Notes</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(calculation.symbolMapping)
              .slice(0, scribesEyeSlots === Infinity ? undefined : scribesEyeSlots)
              .map(([, symbolId]) => (
                <label key={symbolId} className="flex items-center gap-1 text-sm">
                  <span className="font-bold">{symbolId.slice(0, 3)}</span>
                  <input
                    type="text"
                    value={annotations[symbolId] ?? ""}
                    onChange={e => setAnnotations(prev => ({ ...prev, [symbolId]: e.target.value }))}
                    className="w-10 rounded border border-black/30 bg-white/50 px-1 text-center text-xs"
                    maxLength={4}
                  />
                </label>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
