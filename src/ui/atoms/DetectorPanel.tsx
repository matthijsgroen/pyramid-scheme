import type { FC } from "react"
import type { DetectorMode, CompassAccess, CompassHit, ConsumableResult } from "@/game/siteTypes"
import { DetectorToggles } from "./DetectorToggles"

// Every string the readout can show. The counted/interpolated ones arrive as functions so the app
// layer keeps ownership of plural rules and interpolation.
export type DetectorPanelLabels = {
  pickTarget: string
  lookingFor: (symbol: string) => string
  allCollected: string
  access: Record<CompassAccess, string>
  more: (count: number) => string
  noSkippedChests: string
  // The corridor ladder: each unlocked scope answers either way, so the readout is never silent.
  corridorNearby: string
  corridorNoneNearby: string
  corridorOnFloor: string
  corridorNoneOnFloor: string
  corridorOtherFloor: string
  corridorNoneInPyramid: string
}

type Props = {
  labels: DetectorPanelLabels
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
  // Switching modes happens in here rather than in the HUD row — see DetectorButton. Passed through
  // to DetectorToggles; the row is hidden when the player owns only one detector, since a switcher
  // between one thing tells them nothing.
  detectorTitles?: Record<Exclude<DetectorMode, null>, string>
  onSetDetector?: (mode: DetectorMode) => void
  // Corridor detector widens outward (§7.2), one scope per level: L1 = within a few steps of the
  // player, L2 = anywhere on this floor, L3 = any other floor of this pyramid (L4 adds the marker on
  // the journey map, which JourneyCard draws). Each scope reports either way once unlocked.
  corridorNearby?: boolean
  floorHasHiddenCorridor?: boolean
  // Outstanding on floors OTHER than this one — and only floors already visited, so the L3 negative
  // says "none found so far" rather than claiming a pyramid is clean before it has been walked.
  hiddenCorridorOnOtherFloor?: boolean
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
  labels,
  activeDetector,
  compassLevel,
  consumableDetectorLevel,
  detectionLevel,
  compassTarget,
  compassTargetLabel = id => id,
  journeyName = id => id,
  compassResults,
  consumableResults,
  detectorTitles,
  onSetDetector,
  corridorNearby = false,
  floorHasHiddenCorridor = false,
  hiddenCorridorOnOtherFloor = false,
}) => {
  // Closed means no mode: the card doesn't render at all rather than sitting empty above the HUD row.
  // The single button that opens it is DetectorButton, in the HUD row; switching between modes once
  // open is the DetectorToggles row below.
  if (!activeDetector) return null

  // How many detectors the player owns at all — decides whether the switcher above is meaningful.
  const ownedDetectors = [compassLevel, consumableDetectorLevel, detectionLevel].filter(l => l > 0).length

  const shownCompass = uniqueBy(compassResults, r => compassKey(r, compassLevel))
  const shownConsumables = uniqueBy(consumableResults, r => consumableKey(r, consumableDetectorLevel))

  return (
    // `pointer-events-auto` re-enables hit-testing inside SiteHudBar's non-hit-testing band, so taps
    // on this opaque card don't fall through to the map behind it.
    <div className="pointer-events-auto rounded-lg border border-stone-700 bg-stone-900/90 p-2 text-xs text-stone-300">
      {/* Mode switcher, only worth showing when there is a choice to make. */}
      {detectorTitles && onSetDetector && ownedDetectors > 1 && (
        <div className="mb-2 border-b border-stone-700 pb-2">
          <DetectorToggles
            activeDetector={activeDetector}
            compassLevel={compassLevel}
            consumableDetectorLevel={consumableDetectorLevel}
            detectionLevel={detectionLevel}
            titles={detectorTitles}
            onSetDetector={onSetDetector}
          />
        </div>
      )}
      {activeDetector === "compass" && (
        <div>
          {/* Target is picked on the Collection screen (§3C), not here — the HUD only reads it out. */}
          {!compassTarget ? (
            <p className="text-stone-500">{labels.pickTarget}</p>
          ) : (
            <>
              <p className="text-stone-500">{labels.lookingFor(compassTargetLabel(compassTarget))}</p>
              {shownCompass.length === 0 ? (
                <p className="text-stone-500">{labels.allCollected}</p>
              ) : (
                <>
                  {shownCompass.slice(0, 3).map((r, i) => (
                    <div key={i} className="truncate text-amber-200">
                      {ACCESS_ICON[r.access] && <span title={labels.access[r.access]}>{ACCESS_ICON[r.access]} </span>}
                      {compassLabel(r, compassLevel, journeyName)}
                    </div>
                  ))}
                  {shownCompass.length > 3 && <p className="text-stone-500">{labels.more(shownCompass.length - 3)}</p>}
                </>
              )}
            </>
          )}
        </div>
      )}

      {activeDetector === "consumable" && (
        <div>
          {shownConsumables.length === 0 ? (
            <p className="text-stone-500">{labels.noSkippedChests}</p>
          ) : (
            shownConsumables.slice(0, 3).map((r, i) => (
              <div key={i} className="truncate text-amber-200">
                {consumableLabel(r, consumableDetectorLevel, journeyName)}
              </div>
            ))
          )}
          {shownConsumables.length > 3 && <p className="text-stone-500">{labels.more(shownConsumables.length - 3)}</p>}
        </div>
      )}

      {activeDetector === "hiddenPassageway" && (
        // One line per unlocked scope, each stating what it found OR that it found nothing. A scope
        // that goes quiet reads as a broken detector, which is exactly how the old single-line
        // version came across: it only ever spoke up when it had news.
        <div className="text-stone-400">
          <p className={corridorNearby ? "text-amber-200" : undefined}>
            {corridorNearby ? labels.corridorNearby : labels.corridorNoneNearby}
          </p>
          {detectionLevel >= 2 && (
            <p className={floorHasHiddenCorridor ? "text-amber-200" : undefined}>
              {floorHasHiddenCorridor ? labels.corridorOnFloor : labels.corridorNoneOnFloor}
            </p>
          )}
          {detectionLevel >= 3 && (
            <p className={hiddenCorridorOnOtherFloor ? "text-amber-200" : undefined}>
              {hiddenCorridorOnOtherFloor ? labels.corridorOtherFloor : labels.corridorNoneInPyramid}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
