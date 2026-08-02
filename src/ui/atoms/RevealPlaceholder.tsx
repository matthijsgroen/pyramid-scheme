import type { FC } from "react"
import clsx from "clsx"

type RevealPlaceholderProps = {
  /** Pieces held vs. pieces the full collectible needs. */
  progress: { found: number; required: number }
  /** The host's own silhouette — its ghost takes this shape instead of a dashed ring. */
  clipPath?: string
  className?: string
}

// The outline of what a partly-collected thing will become, sitting behind the part of it that
// already exists (revealMaskStyle masks the content itself). Together they read as "you're
// assembling this" rather than as something painted over the art. Shared by every partly-collected
// thing — hieroglyph tiles, map pieces — so they all read the same way.
//
// It owns the "complete → no placeholder at all" rule so no call site has to check, and it is
// absolutely positioned with no wrapper of its own: it renders INSIDE the host, which must be
// `relative`.
export const RevealPlaceholder: FC<RevealPlaceholderProps> = ({ progress, clipPath, className }) => {
  const { found, required } = progress
  if (required <= 0 || found >= required) return null

  // Given a silhouette, a faint fill of that shape — a chipped stone tile's ghost has to match its
  // own edge. Without one, a dashed ring standing for the whole the pieces will add up to.
  return (
    <span
      data-reveal-placeholder
      aria-hidden
      className={clsx(
        "pointer-events-none absolute inset-0",
        clipPath ? "bg-current opacity-10" : "rounded-full border border-dashed border-current opacity-30",
        className
      )}
      style={{ clipPath }}
    />
  )
}
