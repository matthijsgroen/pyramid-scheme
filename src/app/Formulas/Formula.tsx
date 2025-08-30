import type { Difficulty } from "@/data/difficultyLevels"
import type { FC } from "react"
import { FormulaPart, type FilledTileState } from "./FormulaPart"
import type { Formula as FormulaType } from "@/app/Formulas/formulas"

export const Formula: FC<{
  formula: FormulaType
  showResult: boolean
  difficulty: Difficulty
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  onTileClick?: (symbolId: string, position: string) => void
  formulaIndex: number
}> = ({ formula, showResult, difficulty, symbolMapping, filledState, onTileClick, formulaIndex }) => (
  <FormulaPart
    formula={formula}
    showResult={true}
    obfuscateResult={!showResult}
    difficulty={difficulty}
    symbolMapping={symbolMapping}
    filledState={filledState}
    onTileClick={onTileClick}
    positionPrefix={`formula-${formulaIndex}`}
  />
)
