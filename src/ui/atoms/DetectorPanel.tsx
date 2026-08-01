import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { DetectorMode, CompassAccess, CompassHit, ConsumableResult } from "@/game/siteTypes"

type Props = {
  activeDetector: DetectorMode
  compassLevel: number // 0 = not unlocked
  consumableDetectorLevel: number // 0 = not unlocked
  detectionLevel: number // 0 = not unlocked
  // The hunted hieroglyph, picked on the Collection screen (§3C). null = nothing picked yet.
  compassTarget: string | null
  // How to SHOW the target (id → glyph) and a journey (id → its localized name). Injected rather
  // than looked up here: this is a presentational atom, and the target's meaning is mod-owned.
  compassTargetLabel?: (id: string) => string
  journeyName?: (journeyId: string) => string
  compassResults: CompassHit[]
  consumableResults: ConsumableResult[]
  onSetDetector: (mode: DetectorMode) => void
  // Corridor detector widens outward (§7.2): L2 = an unfound corridor on this floor; L3 = the count
  // still outstanding across the whole pyramid. Both default off so lower levels stay silent.
  floorHasHiddenCorridor?: boolean
  pyramidHiddenCorridorCount?: number
}

const MODE_ICON: Record<string, string> = {
  compass: "🧭",
  consumable: "🎒",
  hiddenPassageway: "👁",
}

const uniqueBy = <T,>(items: T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>()
  return items.filter(item => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// Precision narrows inward with level (§7.2): L1 pyramid, L2 +floor, L3 +exact cell. The key
// collapses hits to the shown precision so lower levels don't list the same pyramid/floor twice —
// L1 keys on the PYRAMID (journey + level), since a journey holds several and naming only the
// journey would be a whole expedition rather than the "which pyramid" the design specifies.
const compassKey = (r: CompassHit, level: number): string =>
  level <= 1
    ? `${r.journeyId}:${r.levelIdx}`
    : level === 2
      ? `${r.journeyId}:${r.levelIdx}:${r.floorIdx}`
      : `${r.journeyId}:${r.levelIdx}:${r.floorIdx}:${r.cell?.row},${r.cell?.col}`

// What each access verdict looks like. "open" shows nothing — a bare row means "nothing known in the
// way", which is all the data supports; only the blockers get a badge. See CompassAccess.
const ACCESS_ICON: Record<CompassAccess, string> = {
  open: "",
  locked: "🔒",
  hidden: "👁",
  unknown: "❓",
}

const compassLabel = (r: CompassHit, level: number, journeyName: (id: string) => string): string => {
  // L#/F# keeps the shipped notation (# = pyramid, then floor); only the journey id → name changes.
  const pyramid = `${journeyName(r.journeyId)} L${r.levelIdx + 1}`
  if (level <= 1) return pyramid
  const floor = `${pyramid} F${r.floorIdx + 1}`
  return level >= 3 && r.cell ? `${floor} · (${r.cell.row},${r.cell.col})` : floor
}

const consumableKey = (r: ConsumableResult, level: number): string =>
  level <= 1
    ? r.journeyId
    : level === 2
      ? `${r.journeyId}:${r.floorIdx}`
      : `${r.journeyId}:${r.floorIdx}:${r.cell.row},${r.cell.col}`

// The supplies readout gets the same name treatment. Its L1 stays journey-wide, unlike the compass:
// ConsumableResult carries no levelIdx (it's rebuilt from an edgeId), so pyramid precision here
// needs the skipped-consumable store to record one first.
const consumableLabel = (r: ConsumableResult, level: number, journeyName: (id: string) => string): string => {
  const journey = journeyName(r.journeyId)
  if (level <= 1) return journey
  const floor = `${journey} F${r.floorIdx + 1}`
  return level >= 3 ? `${floor} · (${r.cell.row},${r.cell.col})` : floor
}

export const DetectorPanel: FC<Props> = ({
  activeDetector,
  compassLevel,
  consumableDetectorLevel,
  detectionLevel,
  compassTarget,
  compassTargetLabel = id => id,
  journeyName = id => id,
  compassResults,
  consumableResults,
  onSetDetector,
  floorHasHiddenCorridor = false,
  pyramidHiddenCorridorCount = 0,
}) => {
  const { t } = useTranslation("common")
  if (compassLevel === 0 && consumableDetectorLevel === 0 && detectionLevel === 0) return null

  const toggle = (mode: DetectorMode) => onSetDetector(activeDetector === mode ? null : mode)

  const shownCompass = uniqueBy(compassResults, r => compassKey(r, compassLevel))
  const shownConsumables = uniqueBy(consumableResults, r => consumableKey(r, consumableDetectorLevel))

  return (
    // `pointer-events-auto` re-enables hit-testing inside SiteHudBar's non-hit-testing band: needed
    // for the mode toggles below, and it keeps taps on this opaque card from falling through to the
    // map behind it.
    <div className="pointer-events-auto rounded-lg border border-stone-700 bg-stone-900/90 p-2 text-xs text-stone-300">
      <div className="mb-2 flex gap-2">
        {compassLevel > 0 && (
          <button
            onClick={() => toggle("compass")}
            className={`rounded px-2 py-1 ${activeDetector === "compass" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title={t("detector.compassTitle")}
          >
            {MODE_ICON.compass}
          </button>
        )}
        {consumableDetectorLevel > 0 && (
          <button
            onClick={() => toggle("consumable")}
            className={`rounded px-2 py-1 ${activeDetector === "consumable" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title={t("detector.consumableTitle")}
          >
            {MODE_ICON.consumable}
          </button>
        )}
        {detectionLevel > 0 && (
          <button
            onClick={() => toggle("hiddenPassageway")}
            className={`rounded px-2 py-1 ${activeDetector === "hiddenPassageway" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title={t("detector.corridorTitle")}
          >
            {MODE_ICON.hiddenPassageway}
          </button>
        )}
      </div>

      {activeDetector === "compass" && (
        <div>
          {/* Target is picked on the Collection screen (§3C), not here — the HUD only reads it out. */}
          {!compassTarget ? (
            <p className="text-stone-500">{t("detector.pickTarget")}</p>
          ) : (
            <>
              <p className="text-stone-500">
                {t("detector.lookingFor", { symbol: compassTargetLabel(compassTarget) })}
              </p>
              {shownCompass.length === 0 ? (
                <p className="text-stone-500">{t("detector.allCollected")}</p>
              ) : (
                <>
                  {shownCompass.slice(0, 3).map((r, i) => (
                    <div key={i} className="truncate text-amber-200">
                      {ACCESS_ICON[r.access] && (
                        <span title={t(`detector.access.${r.access}`)}>{ACCESS_ICON[r.access]} </span>
                      )}
                      {compassLabel(r, compassLevel, journeyName)}
                    </div>
                  ))}
                  {shownCompass.length > 3 && (
                    <p className="text-stone-500">{t("detector.more", { count: shownCompass.length - 3 })}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeDetector === "consumable" && (
        <div>
          {shownConsumables.length === 0 ? (
            <p className="text-stone-500">{t("detector.noSkippedChests")}</p>
          ) : (
            shownConsumables.slice(0, 3).map((r, i) => (
              <div key={i} className="truncate text-amber-200">
                {consumableLabel(r, consumableDetectorLevel, journeyName)}
              </div>
            ))
          )}
          {shownConsumables.length > 3 && (
            <p className="text-stone-500">{t("detector.more", { count: shownConsumables.length - 3 })}</p>
          )}
        </div>
      )}

      {activeDetector === "hiddenPassageway" && (
        <div className="text-stone-400">
          <p>{t("detector.corridorNearby", { level: detectionLevel })}</p>
          {detectionLevel >= 2 && floorHasHiddenCorridor && (
            <p className="text-amber-200">{t("detector.corridorOnFloor")}</p>
          )}
          {detectionLevel >= 3 && pyramidHiddenCorridorCount > 0 && (
            <p className="text-amber-200">
              {t("detector.corridorPyramidCount", { count: pyramidHiddenCorridorCount })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
