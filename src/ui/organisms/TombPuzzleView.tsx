import type { FC, FormEvent } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { TableauLevel } from "@/data/tableaus"
import type { RewardCalculation } from "@/mods/hieroglyph/game/generateRewardCalculation"
import type { HieroglyphSymbolResolver } from "@/data/resolveHieroglyphSymbol"
import type { ChestState } from "@/ui/atoms/Chest"
import { TombDoor } from "@/ui/atoms/TombDoor"
import { TombLockPanel } from "@/ui/molecules/TombLockPanel"
import { HieroglyphInventoryStrip, type InventoryStripItem } from "@/ui/molecules/HieroglyphInventoryStrip"
import { TombTableau, type OrderedFormula } from "@/ui/organisms/TombTableau"
import type { FilledTileState } from "@/ui/molecules/FormulaPart"

export const TombPuzzleView: FC<{
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
  scribesEyeSlots?: number
  isPuzzleCompleted: boolean
  lockState: ChestState
  lockValue: string
  onLockChange: (value: string) => void
  onLockSubmit: (e?: FormEvent) => void
  lockDisabled?: boolean
  lockPlaceholder?: string
  inventoryTitle: string
  inventoryItems: InventoryStripItem[]
  onInventoryItemClick: (symbolId: string) => void
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
  scribesEyeSlots,
  isPuzzleCompleted,
  lockState,
  lockValue,
  onLockChange,
  onLockSubmit,
  lockDisabled,
  lockPlaceholder,
  inventoryTitle,
  inventoryItems,
  onInventoryItemClick,
}) => (
  <div className="flex flex-1 flex-row overflow-y-auto">
    <div className="flex flex-1" />
    <div className="flex min-w-fit flex-1 flex-col items-center justify-center overflow-y-auto px-4 text-white">
      <div className="flex flex-1" />
      <TombDoor
        className="flex flex-2 flex-col items-center justify-center"
        open={lockState === "open"}
        difficulty={difficulty}
      >
        {isPuzzleCompleted && (
          <TombLockPanel
            difficulty={difficulty}
            lockState={lockState}
            value={lockValue}
            onChange={onLockChange}
            onSubmit={onLockSubmit}
            disabled={lockDisabled}
            placeholder={lockPlaceholder}
          />
        )}
        <TombTableau
          difficulty={difficulty}
          tableau={tableau}
          calculation={calculation}
          filledState={filledState}
          resolveTile={resolveTile}
          hintFormulas={hintFormulas}
          solvedPercentage={solvedPercentage}
          annotations={annotations}
          onTileClick={onTileClick}
          onAnnotationChange={onAnnotationChange}
          scribesEyeSlots={scribesEyeSlots}
        />
        {!isPuzzleCompleted && (
          <HieroglyphInventoryStrip title={inventoryTitle} items={inventoryItems} onItemClick={onInventoryItemClick} />
        )}
      </TombDoor>
    </div>
    <div className="flex flex-1" />
  </div>
)
