import type { FC, FormEvent } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { TableauLevel } from "@/mods/hieroglyph/game/tableaus"
import type { HieroglyphSymbolResolver } from "@/ui/molecules/FormulaPart"
import type { ChestState } from "@/ui/atoms/Chest"
import { TombDoor } from "@/ui/atoms/TombDoor"
import { TombLockPanel } from "@/ui/molecules/TombLockPanel"
import { HieroglyphInventoryStrip, type InventoryStripItem } from "@/ui/molecules/HieroglyphInventoryStrip"
import { TombTableau, type OrderedFormula, type TableauCalculation } from "@/mods/hieroglyph/app/TombTableau"
import type { FilledTileState } from "@/ui/molecules/FormulaPart"

export const TombPuzzleView: FC<{
  difficulty: Difficulty
  tableau: TableauLevel
  calculation: TableauCalculation
  filledState: FilledTileState
  resolveTile: HieroglyphSymbolResolver
  hintFormulas: OrderedFormula[]
  onTileClick?: (symbolId: string, position: string) => void
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
  onTileClick,
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
  // No backdrop of its own: `EncounterModal` wears the floor's wall now, so the whole card is stone and
  // this view is the part of it the door stands in. Painting the wall here as well put the same image on
  // three layers at three different scales.
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
          onTileClick={onTileClick}
        />
        {!isPuzzleCompleted && (
          <HieroglyphInventoryStrip title={inventoryTitle} items={inventoryItems} onItemClick={onInventoryItemClick} />
        )}
      </TombDoor>
    </div>
    <div className="flex flex-1" />
  </div>
)
