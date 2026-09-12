import type { FC, PropsWithChildren } from "react"
import clsx from "clsx"
import masonryStone from "@/assets/masonry-stone.png"

// A block of stonework wrapped around something, with the opening cut into it. Its tile belongs to no
// rank — a mosaic window is not in anyone's tomb — so it keeps a plain square masonry tile of its own,
// where a tomb wall (tombImageMap.ts) is a rank's own strip laid by width.
export const StoneFrame: FC<PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div
    className={clsx("inline-block bg-yellow-800 p-3", className)}
    style={{ backgroundImage: `url(${masonryStone})`, backgroundSize: "140px 140px" }}
  >
    {/* Recess: the opening sits deeper than the stone around it */}
    <div className="h-full shadow-[0_0_14px_4px_rgba(0,0,0,0.75)_inset]">{children}</div>
  </div>
)
