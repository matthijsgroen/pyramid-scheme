import type { FC } from "react"
import type { DetectorMode } from "@/game/siteTypes"
import { MODE_ICON } from "./detectorModeIcons"

// The detector mode buttons, as a row. These live INSIDE the open readout now, not in the HUD row:
// three of them plus the key ring, the hearts, the supplies and the balance did not fit a phone, so
// the HUD carries one DetectorButton and the choice of mode moved in here with the results it
// changes. DetectorPanel hides this row entirely when only one detector is owned — a switcher
// between one thing is just noise.
//
// No card of its own: the panel it sits in brings the styling and the hit-testing.
type Props = {
  activeDetector: DetectorMode
  compassLevel: number // 0 = not unlocked
  consumableDetectorLevel: number // 0 = not unlocked
  detectionLevel: number // 0 = not unlocked
  // Button tooltips, one per mode.
  titles: Record<Exclude<DetectorMode, null>, string>
  onSetDetector: (mode: DetectorMode) => void
}

export const DetectorToggles: FC<Props> = ({
  activeDetector,
  compassLevel,
  consumableDetectorLevel,
  detectionLevel,
  titles,
  onSetDetector,
}) => {
  // Nothing unlocked yet → no buttons at all (and no empty gap in the HUD row).
  if (compassLevel === 0 && consumableDetectorLevel === 0 && detectionLevel === 0) return null

  // Tapping the active mode switches it back off.
  const toggle = (mode: DetectorMode) => onSetDetector(activeDetector === mode ? null : mode)

  const modeButton = (mode: Exclude<DetectorMode, null>) => (
    <button
      onClick={() => toggle(mode)}
      className={`rounded px-2 py-1 text-xs ${
        activeDetector === mode ? "bg-amber-700 text-amber-100" : "bg-stone-800/90 text-stone-300 hover:bg-stone-700"
      }`}
      title={titles[mode]}
    >
      {MODE_ICON[mode]}
    </button>
  )

  return (
    <div className="flex gap-2">
      {compassLevel > 0 && modeButton("compass")}
      {consumableDetectorLevel > 0 && modeButton("consumable")}
      {detectionLevel > 0 && modeButton("hiddenPassageway")}
    </div>
  )
}
