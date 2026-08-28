import type { FC } from "react"
import type { VesselShape } from "./vesselShapes"

type Props = {
  shape: VesselShape
  /** How full it stands, 0 to 1. */
  fill: number
  /** Class for the contents, and for the vessel's own outline. */
  liquid: string
  outline: string
  /**
   * Whether the contents find their own level.
   *
   * Water does; grain and natron do not — they heap, and they ride round with the vessel when it is
   * tipped instead of holding flat. Both of those follow from this one flag.
   */
  settles: boolean
  /** Whether this vessel is mid-pour. */
  tipping?: boolean
}

export const Vessel: FC<Props> = ({ shape, fill, liquid, outline, settles, tipping }) => {
  const id = `vessel-${Math.round(fill * 1000)}-${liquid.length}-${outline.length}-${shape.top}`
  const span = shape.bottom - shape.top
  const surface = shape.bottom - fill * span
  return (
    <svg viewBox="0 0 100 150" className="size-full overflow-visible">
      <defs>
        <clipPath id={id}>
          <path d={shape.body} />
        </clipPath>
      </defs>
      {/* The contents, clipped to the body.

          **Two groups, and they cannot be one.** A clip travels with its element's own transform, so
          counter-rotating the group that carries the clip turns the body as well and buys nothing. The clip
          stays out here; the contents turn inside it, about the pivot the vessel turns about, so a liquid
          surface holds level with the world while the pot goes over. */}
      <g clipPath={`url(#${id})`}>
        <g
          className={tipping === true && settles ? "animate-pour-level" : undefined}
          style={{ transformBox: "view-box", transformOrigin: "50px 132px" }}
        >
          <rect
            x="-100"
            width="300"
            y={surface}
            height={fill * span + 220}
            className={liquid}
            style={{ transition: "y 300ms, height 300ms" }}
          />
          {/* What does not settle heaps instead: a shallow cone standing on the surface, clipped to the
              vessel like everything else, so it only shows where there is room for it. */}
          {!settles && fill > 0 && fill < 1 && (
            <path
              d={`M 8 ${surface} L 50 ${surface - 11} L 92 ${surface} Z`}
              className={liquid}
              style={{ transition: "d 300ms" }}
            />
          )}
        </g>
      </g>
      <path d={shape.body} fill="none" strokeWidth="4" className={outline} />
      {shape.fittings.map((fitting, index) => (
        <path key={index} d={fitting} fill="none" strokeWidth="4" strokeLinecap="round" className={outline} />
      ))}
    </svg>
  )
}
