import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { HieroglyphTile } from "./HieroglyphTile"
import { Badge } from "@/ui/atoms/Badge"

// One cell in a Collection category grid, in one of three states:
// - "empty"     — not found yet: recessed "?" placeholder. Not clickable: there's nothing to show,
//   and nothing to hunt for a symbol you've never turned up a piece of.
// - "partial"   — some fragments found: partial-reveal tile + an "X/required" count badge.
//   CLICKABLE, so the Collection screen can serve as the compass's target picker — "you see Ra 3/5
//   → tap to hunt it" (docs/mods/collection-and-detector-design.md §3C). HieroglyphCollectionSection's
//   HuntBar only offers an UNcollected hieroglyph, so dropping onClick here (as this used to) left
//   the hunt button permanently unreachable: clickable ⟹ collected ⟹ not huntable.
// - "collected" — fully owned: clickable revealed tile (opens the detail panel). A stackable item
//   (junk) can pass `count` for a "how many held" badge; the badge hides itself at 0 (sold out).
// Wraps HieroglyphTile so the state → visual mapping lives in one place instead of being
// re-derived per Collection section.
type CollectibleSlotProps = {
  state: "empty" | "partial" | "collected"
  symbol?: string
  difficulty?: Difficulty
  progress?: { found: number; required: number }
  count?: number
  selected?: boolean
  onClick?: () => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export const CollectibleSlot: FC<CollectibleSlotProps> = ({
  state,
  symbol,
  difficulty,
  progress,
  count,
  selected = false,
  onClick,
  size = "md",
  className = "aspect-square",
}) => {
  if (state === "empty") return <HieroglyphTile empty size={size} className={className} />

  if (state === "partial")
    return (
      <Badge label={progress ? `${progress.found}/${progress.required}` : undefined}>
        <HieroglyphTile
          symbol={symbol}
          difficulty={difficulty}
          fragmentProgress={progress}
          selected={selected}
          onClick={onClick}
          size={size}
          className={className}
        />
      </Badge>
    )

  const tile = (
    <HieroglyphTile
      symbol={symbol}
      difficulty={difficulty}
      selected={selected}
      onClick={onClick}
      size={size}
      className={className}
    />
  )
  // Only stackable sections pass `count`, so other sections keep the bare tile (no wrapper div).
  return count !== undefined ? <Badge count={count}>{tile}</Badge> : tile
}
