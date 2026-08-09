import type { FC } from "react"
import clsx from "clsx"
import { HieroglyphTile } from "./HieroglyphTile"
import type { Difficulty } from "@/data/difficultyLevels"

export type InventoryStripItem = {
  symbolId: string
  symbol?: string
  difficulty: Difficulty
  // A completed hieroglyph is owned = usable in every slot of every tableau (reusable key, never
  // consumed). Not owned → still collecting its fragments; `found`/`required` shows how close.
  owned: boolean
  found: number
  required: number
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
            // Not owned: no opacity dimming here — it would wash out the glyph overlay inside the
            // tile, which needs to stay fully legible. The tile's own reveal mask + ghost already
            // read as "incomplete" on their own.
            item.owned ? "cursor-pointer bg-white/10 hover:bg-white/20" : "cursor-not-allowed"
          )}
          onClick={() => item.owned && onItemClick(item.symbolId)}
        >
          <HieroglyphTile
            symbol={item.symbol}
            difficulty={item.difficulty}
            size="sm"
            // Not owned yet: the part-carved stone + fragment count names which glyph is missing,
            // instead of a flat grey tile that gives no hint which symbol it is.
            fragmentProgress={item.owned ? undefined : { found: item.found, required: item.required }}
            className="pointer-events-none"
          />
          <div className="flex flex-col text-xs">
            {item.owned ? (
              <span className="text-green-400">✓</span>
            ) : (
              <span className="font-bold text-red-400" title="fragments found">
                {item.found}/{item.required} needed
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
)
