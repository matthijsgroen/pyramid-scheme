import type { FC } from "react"
import clsx from "clsx"
import { RevealMask } from "@/ui/atoms/RevealMask"

type MapPieceIconProps = {
  /** Pieces of this tomb's map held vs. needed. Omit (or complete) to show the scroll unmasked. */
  progress?: { found: number; required: number }
  size?: "md" | "lg"
  className?: string
}

// A fixed square box, so the dial is a circle centred on the glyph in every context rather than an
// ellipse tracking whatever line-height the surrounding text sets.
const sizeClasses = {
  md: "h-12 w-12 text-4xl",
  lg: "h-20 w-20 text-6xl",
}

// A map piece with how much of its map is gathered read straight off the icon — the same
// partial-collection language as a part-collected hieroglyph tile (RevealMask), so the two
// collectibles look alike. The reward popup pairs it with the progress line in words.
//
// The wedge is a circular dial rather than the scroll's own silhouette (which is what the tile
// passes down): an emoji has no clip-path to borrow, and a square sweep over a glyph that doesn't
// fill its box reads as a dark block instead of a sweep.
export const MapPieceIcon: FC<MapPieceIconProps> = ({ progress, size = "lg", className }) => (
  <span className={clsx("relative inline-flex items-center justify-center leading-none", sizeClasses[size], className)}>
    📜
    {progress && <RevealMask progress={progress} className="rounded-full" />}
  </span>
)
