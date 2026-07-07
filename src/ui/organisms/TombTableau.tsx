import type { Difficulty } from "@/data/difficultyLevels"
import { hieroglyphLevelColors } from "@/ui/atoms/hieroglyphLevelColors"
import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/game/puzzles/tableau/generateRewardCalculation"
import type { Formula as FormulaType } from "@/app/Formulas/formulas"
import { revealText } from "@/support/revealText"
import clsx from "clsx"
import type { FC } from "react"
import { Formula } from "@/ui/molecules/Formula"
import type { FilledTileState } from "@/ui/molecules/FormulaPart"
import type { HieroglyphSymbolResolver } from "@/data/resolveHieroglyphSymbol"

export type OrderedFormula = { formula: FormulaType; index: number }

export const TombTableau: FC<{
  difficulty: Difficulty
  tableau: TableauLevel
  calculation: RewardCalculation
  filledState: FilledTileState
  resolveTile: HieroglyphSymbolResolver
  hintFormulas: OrderedFormula[]
  solvedPercentage: number
  annotations: Record<string, string>
  onTileClick?: (symbolId: string, position: string) => void
  onAnnotationChange?: (symbolId: string, value: string) => void
  scribesEyeSlots?: number // 0/undefined = off; Infinity = unlimited
}> = ({
  difficulty,
  tableau,
  calculation,
  filledState,
  resolveTile,
  hintFormulas,
  solvedPercentage,
  annotations,
  onTileClick,
  onAnnotationChange,
  scribesEyeSlots = 0,
}) => (
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
                  onChange={e => onAnnotationChange?.(symbolId, e.target.value)}
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
