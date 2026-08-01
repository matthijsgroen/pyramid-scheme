import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { DetectorMode } from "@/game/siteTypes"

// Just the detector mode buttons, split out of DetectorPanel so they can sit INLINE in the HUD row
// alongside the other widgets (health, coins) instead of claiming a row of their own — a lone
// compass button was taking a full row while that row had space to spare. The readout they toggle
// stays in DetectorPanel, which only appears once a mode is active.
//
// No card of its own: it sits among the other HUD widgets, which bring their own styling. Tapping
// through to the map is already handled by the row that hosts it (see SiteHudBar).
type Props = {
  activeDetector: DetectorMode
  compassLevel: number // 0 = not unlocked
  consumableDetectorLevel: number // 0 = not unlocked
  detectionLevel: number // 0 = not unlocked
  onSetDetector: (mode: DetectorMode) => void
}

const MODE_ICON: Record<string, string> = {
  compass: "🧭",
  consumable: "🎒",
  hiddenPassageway: "👁",
}

export const DetectorToggles: FC<Props> = ({
  activeDetector,
  compassLevel,
  consumableDetectorLevel,
  detectionLevel,
  onSetDetector,
}) => {
  const { t } = useTranslation("common")
  // Nothing unlocked yet → no buttons at all (and no empty gap in the HUD row).
  if (compassLevel === 0 && consumableDetectorLevel === 0 && detectionLevel === 0) return null

  // Tapping the active mode switches it back off.
  const toggle = (mode: DetectorMode) => onSetDetector(activeDetector === mode ? null : mode)

  const modeButton = (mode: Exclude<DetectorMode, null>, title: string) => (
    <button
      onClick={() => toggle(mode)}
      className={`rounded px-2 py-1 text-xs ${
        activeDetector === mode ? "bg-amber-700 text-amber-100" : "bg-stone-800/90 text-stone-300 hover:bg-stone-700"
      }`}
      title={title}
    >
      {MODE_ICON[mode]}
    </button>
  )

  return (
    <div className="flex gap-2">
      {compassLevel > 0 && modeButton("compass", t("detector.compassTitle"))}
      {consumableDetectorLevel > 0 && modeButton("consumable", t("detector.consumableTitle"))}
      {detectionLevel > 0 && modeButton("hiddenPassageway", t("detector.corridorTitle"))}
    </div>
  )
}
