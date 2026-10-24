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

/** Where a board stands in the cavern: its foot on the patch of sunlight, 15% of the painting up from its
 * bottom edge — the painting covers the screen, so that is 15% of the screen height or of 1072/1920 of its
 * width, whichever the painting was scaled to. */
export const cavernFloor = "items-end pb-[max(15vh,8.4vw)]"

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

/** The rocky hill with the cave in it, standing on the desert where a pyramid would. Its shadow is the
 * camel's: the same silhouette flipped down onto the sand, short under an afternoon sun. */
export const CaveMouth: FC = () => (
  <div className="relative w-[min(80vw,32rem)]" data-cave-mouth="">
    <img
      src={caveMouthUrl}
      alt=""
      className="absolute inset-0 origin-bottom -translate-y-1/3 -scale-y-45 opacity-20 brightness-0"
    />
    <img src={caveMouthUrl} alt="" className="relative block" />
  </div>
)
