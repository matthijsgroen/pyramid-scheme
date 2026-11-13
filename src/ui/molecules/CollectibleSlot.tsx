import type { FC, ReactNode } from "react"
import clsx from "clsx"
import type { Difficulty } from "@/data/difficultyLevels"
import { HieroglyphTile } from "./HieroglyphTile"
import { Badge } from "@/ui/atoms/Badge"
import { NewBadge } from "@/ui/atoms/NewBadge"

// One cell in a Collection category grid, in one of three states:
// - "empty"     — not found yet: recessed "?" placeholder. Not clickable: there's nothing to show,
//   and nothing to hunt for a symbol you've never turned up a piece of.
// - "partial"   — some fragments found: partial-reveal tile + an "X/required" count badge. Clickable,
//   so the detail panel shows what is known of it.
// - "collected" — fully owned: clickable revealed tile (opens the detail panel). A stackable item
//   (junk) can pass `count` for a "how many held" badge; the badge hides itself at 0 (sold out).
// Wraps HieroglyphTile so the state → visual mapping lives in one place instead of being
// re-derived per Collection section.
type CollectibleSlotProps = {
  state: "empty" | "partial" | "collected"
  symbol?: string
  imageUrl?: string
  difficulty?: Difficulty
  progress?: { found: number; required: number }
  count?: number
  /** The not-yet-seen label ("NIEUW"): an accent border and a badge on the corner, read with the slot. */
  newLabel?: string
  selected?: boolean
  onClick?: () => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export const CollectibleSlot: FC<CollectibleSlotProps> = props => {
  const slot = <SlotBody {...props} />
  if (!props.newLabel || props.state === "empty") return slot
  return (
    <div className="relative inline-block w-fit rounded-[10px] border-2 border-camp-accent p-0.5">
      {slot}
      <NewBadge label={props.newLabel} className="absolute -top-1.5 -right-1.5" />
    </div>
  )
}

// A clickable slot is a button, so the keyboard and a pad reach it like any other control; the tile lifts on
// the button's hover and press as it does on a tile that takes the click itself.
const Pressable: FC<{ onClick?: () => void; children: ReactNode }> = ({ onClick, children }) =>
  onClick ? (
    <button type="button" onClick={onClick} className="group inline-flex w-fit cursor-pointer rounded-lg">
      {children}
    </button>
  ) : (
    children
  )

const LIFT = "group-hover:-translate-y-1 group-hover:scale-105 group-active:translate-y-0 group-active:scale-95"

const SlotBody: FC<CollectibleSlotProps> = ({
  state,
  symbol,
  imageUrl,
  difficulty,
  progress,
  count,
  selected = false,
  onClick,
  size = "md",
  className = "aspect-square",
}) => {
  if (state === "empty") return <HieroglyphTile empty size={size} className={className} />

  const tileClassName = clsx(onClick && LIFT, className)

  if (state === "partial")
    return (
      <Badge label={progress ? `${progress.found}/${progress.required}` : undefined}>
        <Pressable onClick={onClick}>
          <HieroglyphTile
            symbol={symbol}
            difficulty={difficulty}
            fragmentProgress={progress}
            selected={selected}
            size={size}
            className={tileClassName}
          />
        </Pressable>
      </Badge>
    )

  const tile = (
    <Pressable onClick={onClick}>
      <HieroglyphTile
        symbol={symbol}
        imageUrl={imageUrl}
        difficulty={difficulty}
        selected={selected}
        size={size}
        className={tileClassName}
      />
    </Pressable>
  )
  // Only stackable sections pass `count`, so other sections keep the bare tile (no wrapper div).
  return count !== undefined ? <Badge count={count}>{tile}</Badge> : tile
}
