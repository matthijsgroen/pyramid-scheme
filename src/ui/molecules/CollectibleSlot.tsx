import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { Badge } from "@/ui/atoms/Badge"

// One cell in a Collection category grid, in one of three states:
// - "empty"     — not found yet: recessed "?" placeholder.
// - "partial"   — some fragments found: partial-reveal tile + an "X/required" count badge.
// - "collected" — fully owned: clickable revealed tile (opens the detail panel).
// Wraps HieroglyphTile so the state → visual mapping lives in one place instead of being
// re-derived per Collection section.
type CollectibleSlotProps = {
  state: "empty" | "partial" | "collected"
  symbol?: string
  difficulty?: Difficulty
  progress?: { found: number; required: number }
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
          size={size}
          className={className}
        />
      </Badge>
    )

  return (
    <HieroglyphTile
      symbol={symbol}
      difficulty={difficulty}
      selected={selected}
      onClick={onClick}
      size={size}
      className={className}
    />
  )
}
