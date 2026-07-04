import type { FC } from "react"
import clsx from "clsx"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import type { Difficulty } from "@/data/difficultyLevels"

export type InventoryStripItem = {
  symbolId: string
  symbol?: string
  difficulty: Difficulty
  availableCount: number
  maxNeeded: number
  canPlace: boolean
}

export const HieroglyphInventoryStrip: FC<{
  title: string
  items: InventoryStripItem[]
  onItemClick: (symbolId: string) => void
}> = ({ title, items, onItemClick }) => (
  <div className="mt-8 mb-4 w-fit rounded bg-black/20 p-2">
    <h3 className="mb-2 text-sm font-bold">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button
          key={item.symbolId}
          className={clsx(
            "flex items-center gap-1 rounded p-1 transition-colors select-auto",
            item.canPlace ? "cursor-pointer bg-white/10 hover:bg-white/20" : "cursor-not-allowed opacity-50"
          )}
          onClick={() => item.canPlace && onItemClick(item.symbolId)}
        >
          <HieroglyphTile
            symbol={item.symbol}
            difficulty={item.difficulty}
            size="sm"
            disabled={!item.canPlace}
            className="pointer-events-none"
          />
          <div className="flex flex-col text-xs">
            <span>
              {item.availableCount}/
              <span className={clsx(item.maxNeeded > item.availableCount && "font-bold text-red-400")}>
                {item.maxNeeded}
              </span>
            </span>
          </div>
        </button>
      ))}
    </div>
  </div>
)
