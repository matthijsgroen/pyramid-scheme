import type { FC } from "react"

/**
 * The vessel itself, drawn as an amphora: flared rim, a neck, a shouldered belly and a small foot.
 *
 * **A shape rather than a box, and it earns the trouble.** What is in a canister is never a number (design
 * doc §7), so the silhouette is the whole of what the player reads — and two vessels of different sizes
 * have to be told apart at a glance, from across a board, by outline alone.
 *
 * **The level is drawn as a fraction of the capacity, not as a physical volume.** A real amphora holds
 * more per centimetre at the belly than at the neck, and drawing it that way would be truer and worse: the
 * player is tracking a number of measures, and a half-full canister has to look half full whatever shape
 * it is.
 */
// A flared rim, a narrow neck, a shouldered belly and a small foot.
//
// **The belly stops short of the full width on purpose.** The handles need somewhere OUTSIDE it to swing,
// and drawn any wider they ran along the body's own outline and vanished into it — a vessel with handles
// you cannot see is just an urn.
const BODY = "M 33 4 L 67 4 L 61 26 C 84 46 82 98 55 134 L 45 134 C 18 98 16 46 39 26 Z"
const FOOT = "M 39 134 L 61 134"
// A short high ear: out of the neck, round, and back down onto the shoulder. Swept lower and longer they
// ran most of the height of the vessel and read as a second outline rather than as handles.
const HANDLE_LEFT = "M 40 25 C 20 23 7 40 22 57"
const HANDLE_RIGHT = "M 60 25 C 80 23 93 40 78 57"

type Props = {
  /** How full it stands, 0 to 1. */
  fill: number
  /** Class for the water, and for the vessel's own outline. */
  liquid: string
  outline: string
  /** Laid over the water where the amount is being withheld. */
  uncertain?: string
}

export const Amphora: FC<Props> = ({ fill, liquid, outline, uncertain }) => {
  // The clip is per-instance: two amphorae on one screen would otherwise share one id and one fill level.
  const id = `amphora-${Math.round(fill * 1000)}-${liquid.length}-${outline.length}`
  return (
    <svg viewBox="0 0 100 150" className="size-full overflow-visible">
      <defs>
        <clipPath id={id}>
          <path d={BODY} />
        </clipPath>
      </defs>
      {/* The water, clipped to the belly, standing at its level. */}
      <g clipPath={`url(#${id})`}>
        <rect
          x="0"
          width="100"
          y={150 - fill * 150}
          height={fill * 150}
          className={liquid}
          style={{ transition: "y 300ms, height 300ms" }}
        />
        {uncertain !== undefined && fill > 0 && (
          <rect x="0" width="100" y={150 - fill * 150} height={fill * 150} className={uncertain} />
        )}
      </g>
      <path d={BODY} fill="none" strokeWidth="4" className={outline} />
      <path d={HANDLE_LEFT} fill="none" strokeWidth="4" strokeLinecap="round" className={outline} />
      <path d={HANDLE_RIGHT} fill="none" strokeWidth="4" strokeLinecap="round" className={outline} />
      <path d={FOOT} fill="none" strokeWidth="5" strokeLinecap="round" className={outline} />
    </svg>
  )
}
