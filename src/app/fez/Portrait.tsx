import clsx from "clsx"
import type { FC } from "react"
import { GHOSTS, type Speaker } from "./arrivalConversation"
import type { PortraitArt } from "./portraits"

/**
 * A speaker's figure with its faces stacked over it and the figure's foreground over those, one box so a
 * mirror or a bounce moves them as one. Only `art.face` shows; the other `faces` stay mounted and hidden,
 * so a look arriving later is loaded.
 */
export const Portrait: FC<{
  speaker: Speaker
  art: PortraitArt
  /** Every face layer to keep mounted. Defaults to the art's own. */
  faces?: string[]
  /** Every sprite is drawn facing right, which is towards the other speaker only from the left. */
  mirrored?: boolean
  className?: string
}> = ({ speaker, art, faces = art.face ? [art.face] : [], mirrored = speaker === "explorer", className }) => (
  <div
    className={clsx(
      "relative animate-subtle-bounce",
      art.wide ? "w-70" : "w-50",
      mirrored && "-scale-x-100",
      // The dead are see-through. Drawn opaque and faded here rather than painted
      // translucent, so one sprite serves and the room shows through all of them equally.
      GHOSTS.includes(speaker) && "opacity-70",
      className
    )}
  >
    <img src={art.src} alt={art.alt} className="w-full" />
    {faces.map(src => (
      <img
        key={src}
        src={src}
        alt=""
        data-face
        className={clsx("absolute inset-0 w-full", src !== art.face && "invisible")}
      />
    ))}
    {art.front && <img src={art.front} alt="" data-front className="absolute inset-0 w-full" />}
  </div>
)
