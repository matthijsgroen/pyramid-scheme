import type { Difficulty } from "@/data/difficultyLevels"
import { difficultyMaterialFlat } from "@/ui/tokens/difficultyColors"
import type { TableauLevel } from "@/mods/hieroglyph/game/tableaus"
import type { Formula as FormulaType } from "@/game/formulas/formulas"
import clsx from "clsx"
import type { FC } from "react"
import { Formula } from "@/ui/molecules/Formula"
import type { FilledTileState } from "@/ui/molecules/FormulaPart"
import type { HieroglyphSymbolResolver } from "@/ui/molecules/FormulaPart"

export type OrderedFormula = { formula: FormulaType; index: number }

// What the tableau needs from whatever puzzle it displays: the formula to solve, the symbol → glyph
// mapping to render it with, and the hints that precede it (their count sets the main formula's
// tile index).
export type TableauCalculation = {
  symbolMapping: Record<number, string>
  mainFormula: FormulaType
  hintFormulas: FormulaType[]
}

export const TombTableau: FC<{
  difficulty: Difficulty
  tableau: TableauLevel
  calculation: TableauCalculation
  filledState: FilledTileState
  resolveTile: HieroglyphSymbolResolver
  hintFormulas: OrderedFormula[]
  onTileClick?: (symbolId: string, position: string) => void
}> = ({ difficulty, tableau, calculation, filledState, resolveTile, hintFormulas, onTileClick }) => (
  <div
    className={clsx(
      "relative z-20 flex w-full max-w-md flex-col gap-4 rounded-lg border-t-4 p-4 text-slate-600 shadow-lg",
      difficultyMaterialFlat[difficulty]
    )}
  >
    <h1 className="text-center font-pyramid text-2xl">{tableau.name}</h1>
    <div>{tableau.description}</div>

    {hintFormulas.map(({ formula, index }, key) => (
      <div key={key} className="text-2xl">
        <Formula
          formula={formula}
          showResult={true}
          symbolMapping={calculation.symbolMapping}
          filledState={filledState}
          resolveTile={resolveTile}
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
          symbolMapping={calculation.symbolMapping}
          filledState={filledState}
          resolveTile={resolveTile}
          onTileClick={onTileClick}
          formulaIndex={calculation.hintFormulas.length}
        />
      </span>
    </div>
  </div>
)
