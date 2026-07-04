import type { Difficulty } from "@/data/difficultyLevels"
import clsx from "clsx"
import type { FC, PropsWithChildren } from "react"
import { imageMap } from "./tombImageMap"

export const TombDoor: FC<PropsWithChildren<{ className?: string; open?: boolean; difficulty: Difficulty }>> = ({
  children,
  className,
  difficulty,
  open = false,
}) => {
  const settings = imageMap[difficulty]
  return (
    <div className={clsx("bg-amber-950", "perspective-midrange perspective-origin-left ", className)}>
      <div
        className={clsx(
          settings.color,
          "relative flex h-full w-full origin-left flex-col items-center justify-start pb-4 transition-transform duration-2000 ease-in-out transform-3d",
          open && "rotate-y-90"
        )}
        style={{
          backgroundImage: `url(${settings.image})`,
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
