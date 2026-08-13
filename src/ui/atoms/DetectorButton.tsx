import type { FC } from "react"
import type { DetectorMode } from "@/game/siteTypes"
import { MODE_ICON } from "./detectorModeIcons"

type Props = {
  /** The mode currently showing, or null when the readout is closed. */
  activeDetector: DetectorMode
  title: string
  onToggle: () => void
}

// The one detector control in the HUD row. Every detector the player owns used to have its own button
// here; with three of them beside the key ring, the hearts, the supplies and the balance, the row ran
// out of phone. This opens and closes the readout, and the choice of WHICH detector moved inside it
// (DetectorToggles), next to the results that change with it.
//
// Closed it shows a plain lens; open it shows the running mode's own icon, so the row still says which
// detector is reading without the panel having to be open.
export const DetectorButton: FC<Props> = ({ activeDetector, title, onToggle }) => (
  <button
    onClick={onToggle}
    className={`rounded px-2 py-1 text-xs ${
      activeDetector ? "bg-amber-700 text-amber-100" : "bg-stone-800/90 text-stone-300 hover:bg-stone-700"
    }`}
    title={title}
    aria-pressed={activeDetector !== null}
  >
    {activeDetector ? MODE_ICON[activeDetector] : "🔍"}
  </button>
)
