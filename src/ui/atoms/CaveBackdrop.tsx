import type { FC, PropsWithChildren } from "react"
import { clsx } from "clsx"

// Painted exteriors, one file per variant; a missing file leaves the CSS scene below. Dropping a PNG
// in is the whole hand-over — no manifest.
const art = import.meta.glob("../../assets/exteriors/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const artUrl = (name: string): string | undefined => art[`../../assets/exteriors/${name}.png`]

const files = { mouth: "cave-mouth", cavern: "cavern" } as const

// Sand under a dark opening in the rock face, lit at the lip.
const mouthScene = [
  "radial-gradient(ellipse 34% 46% at 50% 62%, #0a0705 0%, #0a0705 55%, #1c140d 78%, transparent 100%)",
  "linear-gradient(to bottom, #8d7452 0%, #6d583d 52%, #d9b97a 52%, #c79f5f 100%)",
].join(", ")

// Dark rock, a pale shaft of light falling from a gap in the ceiling onto the floor.
const cavernScene = [
  "linear-gradient(to bottom, transparent 0%, transparent 58%, rgb(244 232 196 / 0.55) 82%, transparent 100%)",
  "conic-gradient(from 168deg at 50% -6%, transparent 0deg, rgb(244 232 196 / 0.5) 6deg, rgb(244 232 196 / 0.5) 18deg, transparent 24deg)",
  "radial-gradient(ellipse 60% 30% at 50% 100%, #3b3128 0%, transparent 100%)",
  "linear-gradient(to bottom, #15110e 0%, #221b15 60%, #2d241c 100%)",
].join(", ")

/** The scene a level opens on when it is not out in the open desert: the mouth of a cave, or the sunlit
 * cavern below. Fills its parent like `DesertBackdrop`. */
export const CaveBackdrop: FC<PropsWithChildren<{ variant: "mouth" | "cavern" }>> = ({ variant, children }) => {
  const url = artUrl(files[variant])

  return (
    <div
      className={clsx(
        "relative flex h-full flex-col bg-cover bg-bottom",
        variant === "mouth" ? "bg-stone-800" : "bg-stone-950"
      )}
      style={{ backgroundImage: url ? `url(${url})` : variant === "mouth" ? mouthScene : cavernScene }}
    >
      {children}
    </div>
  )
}
