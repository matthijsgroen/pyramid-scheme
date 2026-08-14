import type { FC } from "react"
import { PULSE_SECONDS, type ProximityBand } from "@/app/SiteMap/detectorProximity"

type Props = {
  band: ProximityBand
  /** What this reading means, for anyone who cannot see a pulse rate. */
  label: string
}

// The running detector's closest reading, as one pulsing dot beside its button — so the reading is
// still there with the readout closed and the map unobstructed.
//
// Rate carries the distance: slow somewhere in the pyramid, quicker on this floor, fast within a few
// steps. Rate alone is no good to a screen reader, or to anyone who cannot pick a 0.5s pulse apart
// from a 1.2s one, so the band is also named in `label` and the colour warms as it closes.
const BAND_COLOR: Record<Exclude<ProximityBand, "none">, string> = {
  pyramid: "bg-stone-400",
  floor: "bg-amber-300",
  near: "bg-amber-200",
}

export const ProximityDot: FC<Props> = ({ band, label }) => {
  if (band === "none") return null
  return (
    <span className="relative inline-flex size-2 shrink-0" role="img" aria-label={label} title={label}>
      {/* The pulse itself: `animate-pulse` carries the easing, the inline duration sets the rate —
          an inline longhand overrides the shorthand the utility class sets. */}
      <span
        className={`absolute inset-0 animate-pulse rounded-full ${BAND_COLOR[band]}`}
        style={{ animationDuration: `${PULSE_SECONDS[band]}s` }}
      />
      {/* A solid core under the pulse, so the dot never disappears entirely mid-cycle. */}
      <span className={`absolute inset-0.5 rounded-full ${BAND_COLOR[band]}`} />
    </span>
  )
}
