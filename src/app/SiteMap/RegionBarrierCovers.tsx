import type { CSSProperties } from "react"
import type { Difficulty, Direction, FloorGrid } from "@/game/siteTypes"
import type { RegionBarrierCover } from "@/game/regionBarrierCover"
import type { ResolveRegionBarrierRealisation } from "@/game/regionBarrierRealisation"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { CELL, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"
import { tileUrl } from "./tileAssets"
import { REGION_COVER_FADE_OUT_MS } from "./useRegionBarrierCovers"

/** The texture repeats once per this many map units, in both directions, anchored at the map's origin so it runs on across cells. */
const TEXTURE_UNITS = CELL * 8

type Fill = { url: string } | { color: string }

/** The way a fade runs, from the side the explorer walks up from to the far side of the cell. */
const TOWARD: Record<Direction, string> = { n: "bottom", s: "top", w: "right", e: "left" }

/** A blockage fades from nothing at its walkable edge to full a cell's width on, so where its piece also
 * spans the gap to the next covered cell that gap is full. Several walkable sides each fade it, intersected. */
const fadeIn = (from: readonly Direction[]): CSSProperties => ({
  maskImage: from.map(dir => `linear-gradient(to ${TOWARD[dir]}, transparent, black ${CELL}px)`).join(", "),
  maskRepeat: "no-repeat",
  ...(from.length > 1 ? { maskComposite: "intersect" } : {}),
})

// A realisation draws its seamless texture once that is painted; until then the flat fill its mod declares.
const fillOf = (
  realisation: string,
  tier: Difficulty,
  resolve: ResolveRegionBarrierRealisation,
  urlOf: typeof tileUrl
): Fill | undefined => {
  const meta = resolve(realisation)
  if (!meta) return undefined
  const url = meta.texture ? urlOf(tier, meta.texture) : undefined
  return url ? { url } : { color: meta.fallback }
}

/**
 * The water or sand lying over a shut region barrier's region, a box per cell. It sits over the floor and
 * under the shade and the lamp, so the floor's own light is what tints it; the marks and props stand above.
 */
export const RegionBarrierCovers = ({
  grid,
  tier,
  standing,
  leaving,
  resolve = resolveRegionBarrierRealisation,
  urlOf = tileUrl,
}: {
  grid: FloorGrid
  tier: Difficulty
  standing: readonly RegionBarrierCover[]
  /** Covers whose barrier has just opened, fading away. */
  leaving: readonly RegionBarrierCover[]
  resolve?: ResolveRegionBarrierRealisation
  urlOf?: typeof tileUrl
}) => {
  const layer = (cover: RegionBarrierCover, fading: boolean) => {
    const fill = fillOf(cover.realisation, tier, resolve, urlOf)
    if (!fill) return null
    const covered = new Set(cover.cells.map(({ at }) => `${at[0]},${at[1]}`))
    return (
      <div
        key={`${fading ? "leaving" : "standing"}:${cover.region}`}
        data-region-cover={cover.region}
        data-realisation={cover.realisation}
        data-leaving={fading ? "" : undefined}
        className={fading ? "animate-region-cover-out" : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
          ...(fading ? { animationDuration: `${REGION_COVER_FADE_OUT_MS}ms` } : {}),
        }}
      >
        {cover.cells.map(({ at: [r, c], fadeFrom }) => {
          const cell = grid.cells[r][c]
          const dirs: ReadonlySet<string> = cell.type === "empty" ? new Set() : cell.dirs
          // Covered neighbours share the gap between them, so the cover runs unbroken along a passage.
          const west = dirs.has("w") && covered.has(`${r},${c - 1}`) ? SIDE_W : 0
          const north = dirs.has("n") && covered.has(`${r - 1},${c}`) ? WALL_H : 0
          const left = cellLeft(c) - west
          const top = cellTop(r) - north
          const paint: CSSProperties =
            "url" in fill
              ? {
                  backgroundImage: `url(${fill.url})`,
                  backgroundSize: `${TEXTURE_UNITS}px ${TEXTURE_UNITS}px`,
                  backgroundPosition: `${-left}px ${-top}px`,
                }
              : { backgroundColor: fill.color }
          return (
            <div
              key={`${r},${c}`}
              data-cover-cell={`${r},${c}`}
              style={{
                position: "absolute",
                left,
                top,
                width: CELL + west,
                height: CELL + north,
                ...paint,
                ...(fadeFrom ? fadeIn(fadeFrom) : {}),
              }}
            />
          )
        })}
      </div>
    )
  }
  return (
    <>
      {standing.map(cover => layer(cover, false))}
      {leaving.map(cover => layer(cover, true))}
    </>
  )
}
