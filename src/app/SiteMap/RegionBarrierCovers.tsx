import type { CSSProperties } from "react"
import type { Direction, FloorGrid, Tileset } from "@/game/siteTypes"
import type { CoverCell, RegionBarrierCover } from "@/game/regionBarrierCover"
import type { ResolveRegionBarrierRealisation } from "@/game/regionBarrierRealisation"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { CELL, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"
import { isPassable, type RoomClaims } from "./roomClaims"
import { tileUrl } from "./tileAssets"
import { REGION_COVER_FADE_OUT_MS } from "./useRegionBarrierCovers"

/** The texture repeats once per this many map units, in both directions, anchored at the map's origin so it runs on across cells. */
const TEXTURE_UNITS = CELL * 8

type Fill = { url: string } | { color: string }

type Box = { left: number; top: number; width: number; height: number }

/** The way a fade runs, from the side the explorer walks up from to the far side of the cell. */
const TOWARD: Record<Direction, string> = { n: "bottom", s: "top", w: "right", e: "left" }

/** A blockage is clear at its walkable edge and thickens to full a whole cell on. The fade spans the blockage's
 * whole drawn footprint (`span`: a chamber with every cell it claims), each cell showing its own slice of the
 * one gradient, so a chamber fades in as one sheet from its dry side. Several walkable sides each fade it,
 * intersected. */
const fadeIn = (from: readonly Direction[], box: Box, span: Box): CSSProperties => ({
  maskImage: from.map(dir => `linear-gradient(to ${TOWARD[dir]}, rgba(0, 0, 0, 0), black ${CELL}px)`).join(", "),
  maskRepeat: "no-repeat",
  maskSize: `${span.width}px ${span.height}px`,
  maskPosition: `${span.left - box.left}px ${span.top - box.top}px`,
  ...(from.length > 1 ? { maskComposite: "intersect" } : {}),
})

/** A cell the cover lies on, and the room it is drawn as part of: its own key, or the chamber claiming it. */
type CoverPiece = CoverCell & { owner: string }

const keyOf = ([r, c]: readonly [number, number]) => `${r},${c}`

/**
 * The cells a cover lies on as the map draws them: the region's cells, and every floor cell a covered chamber
 * claims, so the chamber lies under the cover wall to wall. A claimed cell takes its owner's fade.
 */
const coverPieces = (grid: FloorGrid, cover: RegionBarrierCover, claims: RoomClaims): CoverPiece[] => {
  const byKey = new Map(cover.cells.map(cell => [keyOf(cell.at), cell]))
  const pieces: CoverPiece[] = cover.cells.map(cell => ({
    ...cell,
    owner: claims.claimedBy.get(keyOf(cell.at)) ?? keyOf(cell.at),
  }))
  for (const [cellKey, ownerKey] of claims.claimedBy) {
    const owner = byKey.get(ownerKey)
    if (!owner || byKey.has(cellKey)) continue
    const [r, c] = cellKey.split(",").map(Number)
    // Claimed passage the explorer walks stays as the region decided it; void, the margin past the grid's
    // edge included, is the chamber's floor.
    const cell = grid.cells[r]?.[c]
    if (cell && cell.type !== "empty") continue
    pieces.push(
      owner.fadeFrom ? { at: [r, c], fadeFrom: owner.fadeFrom, owner: ownerKey } : { at: [r, c], owner: ownerKey }
    )
  }
  return pieces
}

const union = (a: Box, b: Box): Box => {
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  const right = Math.max(a.left + a.width, b.left + b.width)
  const bottom = Math.max(a.top + a.height, b.top + b.height)
  return { left, top, width: right - left, height: bottom - top }
}

// A realisation draws its seamless texture once that is painted; until then the flat fill its mod declares.
const fillOf = (
  realisation: string,
  tier: Tileset,
  resolve: ResolveRegionBarrierRealisation,
  urlOf: typeof tileUrl
): Fill | undefined => {
  const meta = resolve(realisation)
  if (!meta) return undefined
  const url = meta.texture ? urlOf(tier, meta.texture) : undefined
  return url ? { url } : { color: meta.fallback }
}

/**
 * The water or sand lying over a shut region barrier's region, a box per cell, a covered chamber's claimed
 * floor included. It sits over the floor and under the shade and the lamp, so the floor's own light is what
 * tints it; the marks and props stand above.
 */
export const RegionBarrierCovers = ({
  grid,
  claims,
  tier,
  standing,
  leaving,
  resolve = resolveRegionBarrierRealisation,
  urlOf = tileUrl,
}: {
  grid: FloorGrid
  /** The floor the chambers claim: where a covered chamber's cover spreads, and where floor runs on between cells. */
  claims: RoomClaims
  tier: Tileset
  standing: readonly RegionBarrierCover[]
  /** Covers whose barrier has just opened, fading away. */
  leaving: readonly RegionBarrierCover[]
  resolve?: ResolveRegionBarrierRealisation
  urlOf?: typeof tileUrl
}) => {
  const layer = (cover: RegionBarrierCover, fading: boolean) => {
    const fill = fillOf(cover.realisation, tier, resolve, urlOf)
    if (!fill) return null
    const pieces = coverPieces(grid, cover, claims)
    const covered = new Set(pieces.map(({ at }) => keyOf(at)))
    // Covered neighbours share the gap between them wherever the floor runs on through it, so the cover is one
    // sheet along a passage and across a chamber, and stops at a wall.
    const placed = pieces.map(piece => {
      const [r, c] = piece.at
      const west = covered.has(`${r},${c - 1}`) && isPassable(grid, claims, r, c - 1, "e") ? SIDE_W : 0
      const north = covered.has(`${r - 1},${c}`) && isPassable(grid, claims, r - 1, c, "s") ? WALL_H : 0
      const box: Box = { left: cellLeft(c) - west, top: cellTop(r) - north, width: CELL + west, height: CELL + north }
      return { piece, box }
    })
    const spans = new Map<string, Box>()
    for (const { piece, box } of placed) {
      if (!piece.fadeFrom) continue
      const span = spans.get(piece.owner)
      spans.set(piece.owner, span ? union(span, box) : box)
    }
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
        {placed.map(({ piece: { at, fadeFrom, owner }, box }) => {
          const paint: CSSProperties =
            "url" in fill
              ? {
                  backgroundImage: `url(${fill.url})`,
                  backgroundSize: `${TEXTURE_UNITS}px ${TEXTURE_UNITS}px`,
                  backgroundPosition: `${-box.left}px ${-box.top}px`,
                }
              : { backgroundColor: fill.color }
          return (
            <div
              key={keyOf(at)}
              data-cover-cell={keyOf(at)}
              style={{
                position: "absolute",
                ...box,
                ...paint,
                ...(fadeFrom ? fadeIn(fadeFrom, box, spans.get(owner) ?? box) : {}),
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
