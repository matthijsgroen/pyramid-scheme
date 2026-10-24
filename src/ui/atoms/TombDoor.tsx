import type { Tileset } from "@/game/siteTypes"
import clsx from "clsx"
import type { FC, PropsWithChildren } from "react"
import { imageMap, WALL_SIZE } from "./tombImageMap"

export const TombDoor: FC<PropsWithChildren<{ className?: string; open?: boolean; wall: Tileset }>> = ({
  children,
  className,
  wall,
  open = false,
}) => {
  const settings = imageMap[wall]
  return (
    <div className={clsx(settings.behind, "perspective-midrange perspective-origin-left", className)}>
      <div
        className={clsx(
          settings.color,
          "relative flex size-full origin-left flex-col items-center justify-start pb-4 transition-transform duration-2000 ease-in-out transform-3d",
          open && "rotate-y-90"
        )}
        style={{
          backgroundImage: `url(${settings.image})`,
          backgroundSize: WALL_SIZE,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {children}
      </div>
    </div>
  )
}
