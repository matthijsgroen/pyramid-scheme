import type { FC } from "react"
import clsx from "clsx"
import { RevealPlaceholder } from "@/ui/atoms/RevealPlaceholder"
import { revealMaskStyle } from "@/ui/atoms/revealMask"

type MapPieceIconProps = {
  /** Pieces of this tomb's map held vs. needed. Omit (or complete) to show the whole scroll. */
  progress?: { found: number; required: number }
  size?: "md" | "lg"
  className?: string
}

// A fixed square box, so the sweep's geometry stays put instead of tracking whatever line-height the
// surrounding text sets.
const sizeClasses = {
  md: "h-12 w-12 text-4xl",
  lg: "h-20 w-20 text-6xl",
}

// A map piece showing how much of its map is gathered: only the collected fraction of the scroll is
// there, inside a dashed ring standing for the finished map. Same partial-collection language as a
// part-collected hieroglyph tile (RevealPlaceholder + revealMaskStyle), so the two collectibles read
// alike. The reward popup pairs it with the progress line in words.
export const MapPieceIcon: FC<MapPieceIconProps> = ({ progress, size = "lg", className }) => (
  <span className={clsx("relative inline-flex items-center justify-center leading-none", sizeClasses[size], className)}>
    {progress && <RevealPlaceholder progress={progress} />}
    <span className="relative" style={progress && revealMaskStyle(progress)}>
      📜
    </span>
  </span>
)
