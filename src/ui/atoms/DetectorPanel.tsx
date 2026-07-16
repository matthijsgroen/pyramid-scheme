import type { FC } from "react"
import type { DetectorMode, CompassResult, ConsumableResult } from "@/game/siteTypes"

type Props = {
  activeDetector: DetectorMode
  compassLevel: number // 0 = not unlocked
  consumableDetectorLevel: number // 0 = not unlocked
  detectionLevel: number // 0 = not unlocked
  compassTarget: string | null
  compassResults: CompassResult[]
  consumableResults: ConsumableResult[]
  onSetDetector: (mode: DetectorMode) => void
  onSetCompassTarget: (hieroglyphId: string) => void
  availableHieroglyphs: { id: string; label: string }[]
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

// Precision narrows inward with level (§7.2): L1 pyramid only, L2 +floor, L3 +exact cell. The key
// collapses hits to the shown precision so lower levels don't list the same pyramid/floor twice.
const compassKey = (r: CompassResult, level: number): string =>
  level <= 1
    ? r.journeyId
    : level === 2
      ? `${r.journeyId}:${r.levelIdx}:${r.floorIdx}`
      : `${r.journeyId}:${r.levelIdx}:${r.floorIdx}:${r.cell?.row},${r.cell?.col}`

const compassLabel = (r: CompassResult, level: number): string => {
  if (level <= 1) return r.journeyId
  const floor = `${r.journeyId} L${r.levelIdx + 1} F${r.floorIdx + 1}`
  return level >= 3 && r.cell ? `${floor} · (${r.cell.row},${r.cell.col})` : floor
}

const consumableKey = (r: ConsumableResult, level: number): string =>
  level <= 1
    ? r.journeyId
    : level === 2
      ? `${r.journeyId}:${r.floorIdx}`
      : `${r.journeyId}:${r.floorIdx}:${r.cell.row},${r.cell.col}`

const consumableLabel = (r: ConsumableResult, level: number): string => {
  if (level <= 1) return r.journeyId
  const floor = `${r.journeyId} F${r.floorIdx + 1}`
  return level >= 3 ? `${floor} · (${r.cell.row},${r.cell.col})` : floor
}

export const DetectorPanel: FC<Props> = ({
  activeDetector,
  compassLevel,
  consumableDetectorLevel,
  detectionLevel,
  compassTarget,
  compassResults,
  consumableResults,
  onSetDetector,
  onSetCompassTarget,
  availableHieroglyphs,
  floorHasHiddenCorridor = false,
  pyramidHiddenCorridorCount = 0,
}) => {
  if (compassLevel === 0 && consumableDetectorLevel === 0 && detectionLevel === 0) return null

  const toggle = (mode: DetectorMode) => onSetDetector(activeDetector === mode ? null : mode)

  const shownCompass = uniqueBy(compassResults, r => compassKey(r, compassLevel))
  const shownConsumables = uniqueBy(consumableResults, r => consumableKey(r, consumableDetectorLevel))

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/90 p-2 text-xs text-stone-300">
      <div className="mb-2 flex gap-2">
        {compassLevel > 0 && (
          <button
            onClick={() => toggle("compass")}
            className={`rounded px-2 py-1 ${activeDetector === "compass" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title="Compass"
          >
            {MODE_ICON.compass}
          </button>
        )}
        {consumableDetectorLevel > 0 && (
          <button
            onClick={() => toggle("consumable")}
            className={`rounded px-2 py-1 ${activeDetector === "consumable" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title="Consumable detector"
          >
            {MODE_ICON.consumable}
          </button>
        )}
        {detectionLevel > 0 && (
          <button
            onClick={() => toggle("hiddenPassageway")}
            className={`rounded px-2 py-1 ${activeDetector === "hiddenPassageway" ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700"}`}
            title="Hidden passageways"
          >
            {MODE_ICON.hiddenPassageway}
          </button>
        )}
      </div>

      {activeDetector === "compass" && (
        <div>
          <select
            value={compassTarget ?? ""}
            onChange={e => onSetCompassTarget(e.target.value)}
            className="mb-1 w-full rounded bg-stone-800 px-1 py-0.5 text-xs text-stone-200"
          >
            <option value="">— pick hieroglyph —</option>
            {availableHieroglyphs.map(h => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
          {compassTarget && shownCompass.length === 0 && <p className="text-stone-500">All pieces collected</p>}
          {shownCompass.slice(0, 3).map((r, i) => (
            <div key={i} className="truncate text-amber-200">
              {compassLabel(r, compassLevel)}
            </div>
          ))}
          {shownCompass.length > 3 && <p className="text-stone-500">+{shownCompass.length - 3} more</p>}
        </div>
      )}

      {activeDetector === "consumable" && (
        <div>
          {shownConsumables.length === 0 ? (
            <p className="text-stone-500">No skipped chests</p>
          ) : (
            shownConsumables.slice(0, 3).map((r, i) => (
              <div key={i} className="truncate text-amber-200">
                {consumableLabel(r, consumableDetectorLevel)}
              </div>
            ))
          )}
          {shownConsumables.length > 3 && <p className="text-stone-500">+{shownConsumables.length - 3} more</p>}
        </div>
      )}

      {activeDetector === "hiddenPassageway" && (
        <div className="text-stone-400">
          <p>Suspicious corners revealed nearby (L{detectionLevel})</p>
          {detectionLevel >= 2 && floorHasHiddenCorridor && (
            <p className="text-amber-200">A hidden corridor waits on this floor</p>
          )}
          {detectionLevel >= 3 && pyramidHiddenCorridorCount > 0 && (
            <p className="text-amber-200">
              This pyramid hides {pyramidHiddenCorridorCount} unexplored corridor{pyramidHiddenCorridorCount > 1 && "s"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
