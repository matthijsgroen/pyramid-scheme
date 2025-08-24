import clsx from "clsx"
import masonry from "@/assets/masonry.png"
import type { FC, PropsWithChildren } from "react"

export const TombDoor: FC<
  PropsWithChildren<{ className?: string; open?: boolean }>
> = ({ children, className, open = false }) => {
  return (
    <div
      className={clsx(
        "bg-amber-950",
        "perspective-midrange perspective-origin-left ",
        className
      )}
    >
      <div
        className={clsx(
          "relative flex h-full w-full origin-left flex-col items-center justify-start bg-yellow-800 pb-4 transition-transform duration-2000 ease-in-out transform-3d",
          open && "rotate-y-90"
        )}
        style={{
          backgroundImage: `url(${masonry})`,
          backgroundSize: "140px 140px",
          backgroundPosition: "bottom center",
          backgroundAttachment: "fixed",
        }}
      >
        {children}
      </div>
    </div>
  )
}
