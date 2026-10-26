import type { Tileset } from "@/game/siteTypes"
import clsx from "clsx"
import type { FC, PropsWithChildren, Ref } from "react"
import { imageMap, WALL_SIZE } from "./tombImageMap"

/** Where the surrounding wall lies behind the door, in CSS background terms. */
export type WallPlacement = { size: string; position: string }

// The scrim the encounter frame lays over its wall (EncounterModal, stone-900 at 55%): a door cut from that
// wall wears it too, or it reads as a lighter panel set into the stone.
const SCRIM = "linear-gradient(rgb(28 25 23 / 0.55), rgb(28 25 23 / 0.55))"

export const TombDoor: FC<
  PropsWithChildren<{
    className?: string
    open?: boolean
    wall: Tileset
    /** Set, the door shows exactly the stretch of wall behind it, so shut it cannot be told from the wall. */
    inWall?: WallPlacement
    ref?: Ref<HTMLDivElement>
  }>
> = ({ children, className, wall, inWall, open = false, ref }) => {
  const settings = imageMap[wall]
  const art = settings.image ? `url(${settings.image})` : undefined
  return (
    <div ref={ref} className={clsx(settings.behind, "perspective-midrange perspective-origin-left", className)}>
      <div
        className={clsx(
          settings.color,
          "relative flex size-full origin-left flex-col items-center justify-start pb-4 transition-transform duration-2000 ease-in-out transform-3d",
          open && "rotate-y-90"
        )}
        style={
          inWall
            ? {
                backgroundImage: art ? `${SCRIM}, ${art}` : undefined,
                backgroundSize: `100% 100%, ${inWall.size}`,
                backgroundPosition: `0 0, ${inWall.position}`,
                backgroundRepeat: "no-repeat",
              }
            : {
                backgroundImage: art,
                backgroundSize: WALL_SIZE,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
        }
      >
        {children}
      </div>
    </div>
  )
}
