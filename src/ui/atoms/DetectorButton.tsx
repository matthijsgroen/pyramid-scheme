import type { FC } from "react"
import type { DetectorMode } from "@/game/siteTypes"
import { MODE_ICON } from "./detectorModeIcons"
import { ProximityDot } from "./ProximityDot"
import type { ProximityBand } from "@/app/SiteMap/detectorProximity"

type Props = {
  /** The detector currently running, or null when none is. Survives closing the readout. */
  activeDetector: DetectorMode
  /** Whether the readout is showing — the button opens and closes it. */
  readoutOpen: boolean
  title: string
  /** The running detector's closest reading, shown as a pulsing dot beside the button. */
  band?: ProximityBand
  bandLabel?: string
  onToggle: () => void
}

// The one detector control in the HUD row. Every detector the player owns used to have its own button
// here; with three of them beside the key ring, the hearts, the supplies and the balance, the row ran
// out of phone. This opens and closes the readout, and the choice of WHICH detector lives inside it
// (DetectorToggles), next to the results that change with it.
//
// A detector keeps running with the readout closed, so the map is not covered while it reads. The dot
// is what makes that worth doing: without it, closing the readout would cost the player every reading
// the detector has. Closed and idle the button shows a lens; with a detector running it wears that
// detector's own icon, so the row says which one is reading either way.
export const DetectorButton: FC<Props> = ({
  activeDetector,
  readoutOpen,
  title,
  band = "none",
  bandLabel = "",
  onToggle,
}) => (
  <div className="flex items-center gap-1">
    <button
      onClick={onToggle}
      className={`rounded px-2 py-1 text-xs ${
        readoutOpen ? "bg-amber-700 text-amber-100" : "bg-stone-800/90 text-stone-300 hover:bg-stone-700"
      }`}
      title={title}
      aria-expanded={readoutOpen}
    >
      {activeDetector ? MODE_ICON[activeDetector] : "🔍"}
    </button>
    <ProximityDot band={band} label={bandLabel} />
  </div>
)
