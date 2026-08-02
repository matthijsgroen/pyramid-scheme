import type { FC } from "react"
import clsx from "clsx"
import { revealSweep } from "./revealSweep"

type RevealMaskProps = {
  /** Pieces held vs. pieces the full collectible needs. */
  progress: { found: number; required: number }
  /** Silhouette to follow — pass the host's own clip-path so the wedge stops at its edge. */
  clipPath?: string
  className?: string
}

// The partial-collection overlay: the found fraction is revealed as a wedge sweeping clockwise from
// 12 o'clock, the rest stays masked. Shared by every partly-collected thing (hieroglyph tiles, map
// pieces) so they all read the same way, and so the "fully collected → no mask at all" rule lives in
// one place instead of at each call site.
//
// Absolutely positioned only, no wrapper of its own: it renders INSIDE the host (which must be
// `relative`) and can therefore inherit the host's silhouette via `clipPath`.
export const RevealMask: FC<RevealMaskProps> = ({ progress, clipPath, className }) => {
  const { found, required } = progress
  if (required <= 0 || found >= required) return null

  return (
    <div
      data-reveal-mask
      className={clsx("pointer-events-none absolute inset-0", className)}
      style={{ background: revealSweep(progress), clipPath }}
    />
  )
}
