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
}

const MODE_ICON: Record<string, string> = {
  compass: "🧭",
  consumable: "🎒",
  hiddenPassageway: "👁",
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
}) => {
  if (compassLevel === 0 && consumableDetectorLevel === 0 && detectionLevel === 0) return null

  const toggle = (mode: DetectorMode) => onSetDetector(activeDetector === mode ? null : mode)

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
          {compassTarget && compassResults.length === 0 && <p className="text-stone-500">All pieces collected</p>}
          {compassResults.slice(0, 3).map((r, i) => (
            <div key={i} className="truncate text-amber-200">
              {r.journeyId} L{r.levelIdx + 1} F{r.floorIdx + 1}
            </div>
          ))}
          {compassResults.length > 3 && <p className="text-stone-500">+{compassResults.length - 3} more</p>}
        </div>
      )}

      {activeDetector === "consumable" && (
        <div>
          {consumableResults.length === 0 ? (
            <p className="text-stone-500">No skipped chests</p>
          ) : (
            consumableResults.slice(0, 3).map((r, i) => (
              <div key={i} className="truncate text-amber-200">
                {r.journeyId}
              </div>
            ))
          )}
          {consumableResults.length > 3 && <p className="text-stone-500">+{consumableResults.length - 3} more</p>}
        </div>
      )}

      {activeDetector === "hiddenPassageway" && (
        <p className="text-stone-400">Suspicious corners revealed (L{detectionLevel})</p>
      )}
    </div>
  )
}
