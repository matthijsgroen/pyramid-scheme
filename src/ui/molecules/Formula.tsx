import type { FC } from "react"
import { FormulaPart, type FilledTileState } from "./FormulaPart"
import type { Formula as FormulaType } from "@/game/formulas/formulas"
import type { HieroglyphSymbolResolver } from "@/data/resolveHieroglyphSymbol"

export const Formula: FC<{
  formula: FormulaType
  showResult: boolean
  symbolMapping: Record<number, string>
  filledState: FilledTileState
  resolveTile: HieroglyphSymbolResolver
  onTileClick?: (symbolId: string, position: string) => void
  formulaIndex: number
}> = ({ formula, showResult, symbolMapping, filledState, resolveTile, onTileClick, formulaIndex }) => (
  <FormulaPart
    formula={formula}
    showResult={true}
    obfuscateResult={!showResult}
    symbolMapping={symbolMapping}
    filledState={filledState}
    resolveTile={resolveTile}
    onTileClick={onTileClick}
    positionPrefix={`formula-${formulaIndex}`}
  />
)
