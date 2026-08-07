import type { FC, PropsWithChildren } from "react"
import clsx from "clsx"
import masonryStone from "@/assets/masonry-stone.png"

// A block of the game's stonework wrapped around something, with the opening cut into it.
// Same tile and tint as the tomb backdrops (see tombImageMap.ts), so a framed thing reads as
// set into the same walls the player has been walking through.
export const StoneFrame: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div
    className={clsx("inline-block bg-yellow-800 p-3", className)}
    style={{ backgroundImage: `url(${masonryStone})`, backgroundSize: "140px 140px" }}
  >
    {/* Recess: the opening sits deeper than the stone around it */}
    <div className="h-full shadow-[0_0_14px_4px_rgba(0,0,0,0.75)_inset]">{children}</div>
  </div>
)
