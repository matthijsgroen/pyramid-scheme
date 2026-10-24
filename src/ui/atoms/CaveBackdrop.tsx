import type { FC, PropsWithChildren } from "react"
import caveMouthUrl from "@/assets/exteriors/cave-mouth.png"

// Painted exteriors, one file each; a missing file leaves the CSS stand-in. Dropping a PNG in is the
// whole hand-over — no manifest.
const art = import.meta.glob("../../assets/exteriors/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const artUrl = (name: string): string | undefined => art[`../../assets/exteriors/${name}.png`]

// Dark rock, a pale shaft of light falling from a gap in the ceiling onto the floor.
const cavernScene = [
  "linear-gradient(to bottom, transparent 0%, transparent 58%, rgb(244 232 196 / 0.55) 82%, transparent 100%)",
  "conic-gradient(from 168deg at 50% -6%, transparent 0deg, rgb(244 232 196 / 0.5) 6deg, rgb(244 232 196 / 0.5) 18deg, transparent 24deg)",
  "radial-gradient(ellipse 60% 30% at 50% 100%, #3b3128 0%, transparent 100%)",
  "linear-gradient(to bottom, #15110e 0%, #221b15 60%, #2d241c 100%)",
].join(", ")

/** The sunlit cavern a level opens on below ground. Fills its parent like `DesertBackdrop`. */
export const CaveBackdrop: FC<PropsWithChildren> = ({ children }) => {
  const url = artUrl("cavern")

  return (
    <div
      className="relative flex h-full flex-col bg-stone-950 bg-cover bg-bottom"
      style={{ backgroundImage: url ? `url(${url})` : cavernScene }}
    >
      {children}
    </div>
  )
}

/** The rocky hill with the cave in it, standing on the desert where a pyramid would. */
export const CaveMouth: FC = () => <img src={caveMouthUrl} alt="" data-cave-mouth="" className="w-[min(80vw,32rem)]" />
