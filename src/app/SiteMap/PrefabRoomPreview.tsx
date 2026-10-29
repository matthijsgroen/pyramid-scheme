import { useMemo, useState } from "react"
import { revealAll } from "@/game/gridNavigation"
import type { Prefab } from "@/game/prefabTypes"
import type { Direction, Tileset } from "@/game/siteTypes"
import { prefabPreviewFloor } from "./prefabPreviewFloor"
import { SiteMapView } from "./SiteMapView"

type Props = {
  prefab: Prefab
  /** What draws it; the prefab's own tier when unset. */
  tileset?: Tileset
  /** Index into the prefab's variants (each layout, then its mirror), and into the fills of that variant. */
  variant?: number
  fill?: number
  /** The doors a walk runs between: the way out each serves. A door the variant has no arm for falls back to the
   * first (from) or last (to) door in use. */
  from?: Direction
  to?: Direction
  className?: string
}

type At = "from" | "to" | "stop" | readonly [number, number]

/** A prefab laid over a minimal floor with every reachable door in use, drawn by the real map, with the explorer
 * walking between two of its doors. */
export const PrefabRoomPreview = ({ prefab, tileset, variant = 0, fill = 0, from, to, className }: Props) => {
  const shown = useMemo(() => {
    try {
      const preview = prefabPreviewFloor(prefab, variant, fill)
      return { preview, grid: revealAll({ ...preview.grid, ...(tileset ? { tileset } : {}) }) }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [prefab, variant, fill, tileset])
  const [at, setAt] = useState<At>("from")
  if ("error" in shown) return <p className="p-2 text-sm text-red-700">{shown.error}</p>
  const { preview, grid } = shown
  const open = Object.keys(preview.doors) as Direction[]
  const start = preview.doors[from ?? open[0]] ?? preview.stop
  const end = preview.doors[to ?? open[open.length - 1]] ?? preview.stop
  const spots = { from: start, to: end, stop: preview.stop }
  const pos = typeof at === "string" ? spots[at] : at
  return (
    <div>
      <div className="flex gap-4 p-2 text-sm">
        <button type="button" onClick={() => setAt("from")}>
          To the first door
        </button>
        <button type="button" onClick={() => setAt("stop")}>
          To the stop
        </button>
        <button type="button" onClick={() => setAt("to")}>
          To the second door
        </button>
        <span>
          {open.length} door{open.length === 1 ? "" : "s"} in use
          {preview.unusedDoors > 0 ? `, ${preview.unusedDoors} walled` : ""}
        </span>
      </div>
      <SiteMapView
        grid={grid}
        explorerPos={pos}
        onCellClick={(r, c) => setAt([r, c])}
        className={className ?? "h-160 w-full"}
      />
    </div>
  )
}
