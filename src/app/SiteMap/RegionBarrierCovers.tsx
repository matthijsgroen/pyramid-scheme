import { Fragment, useState, type CSSProperties, type ReactNode } from "react"
import type { Direction, FloorGrid, Tileset } from "@/game/siteTypes"
import type { CoverCell, RegionBarrierCover } from "@/game/regionBarrierCover"
import type { ResolveRegionBarrierRealisation } from "@/game/regionBarrierRealisation"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { CELL, FACE_H, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"
import { isPassable, type RoomClaims } from "./roomClaims"
import { tileUrl } from "./tileAssets"
import { REGION_COVER_FADE_OUT_MS } from "./useRegionBarrierCovers"

/** The texture repeats once per this many map units, in both directions, anchored at the map's origin so it runs on across cells. */
const TEXTURE_UNITS = CELL * 8

type Fill = ({ url: string; ripple: boolean } | { color: string }) & { wash?: number }

/** A drifting layer of rippling water: the texture at its own scale, moving one period along one axis per loop.
 * The crossing layer is fainter, smaller and runs across the first, so where they overlap the light shifts. */
type Drift = { layer: "base" | "cross"; units: number; axis: "x" | "y"; ms: number; opacity?: number }
const RIPPLE: readonly Drift[] = [
  { layer: "base", units: TEXTURE_UNITS, axis: "x", ms: 60_000 },
  { layer: "cross", units: CELL * 5, axis: "y", ms: 45_000, opacity: 0.35 },
]

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

/** How deep things stand in each covered cell, by "r,c": every cell a standing cover lies on, a covered chamber's
 * claimed floor included, whose realisation declares a depth (`submerge`). */
// eslint-disable-next-line react-refresh/only-export-components -- read off the cover's own pieces, beside the drawing of them
export const submergeDepths = (
  grid: FloorGrid,
  claims: RoomClaims,
  covers: readonly RegionBarrierCover[],
  resolve: ResolveRegionBarrierRealisation = resolveRegionBarrierRealisation
): Map<string, number> => {
  const depths = new Map<string, number>()
  for (const cover of covers) {
    const depth = resolve(cover.realisation)?.submerge
    if (!depth) continue
    for (const { at } of coverPieces(grid, cover, claims)) depths.set(keyOf(at), depth)
  }
  return depths
}

/** How many map units the waterline fades over, upward from where the hidden part ends. */
const WATERLINE_FADE = 6

/**
 * Something standing in water or sand: drawn whole, with everything below `depth` above its floor line hidden and a
 * short fade at the line. The mask is the sprite's own box, so its children stay in map space inside it.
 */
export const Submerged = ({
  box: [x, y, w, h],
  baseY,
  depth,
  id,
  children,
}: {
  box: readonly [number, number, number, number]
  baseY: number
  depth: number
  id: string
  children: ReactNode
}) => {
  const line = baseY - depth - y
  return (
    <div
      data-submerged={id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        maskImage: `linear-gradient(to bottom, black ${line - WATERLINE_FADE}px, transparent ${line}px)`,
      }}
    >
      <div style={{ position: "absolute", left: -x, top: -y, width: 0, height: 0 }}>{children}</div>
    </div>
  )
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
  const wash = meta.wallWash ? { wash: meta.wallWash } : {}
  return url ? { url, ripple: meta.motion === "ripple", ...wash } : { color: meta.fallback, ...wash }
}

/**
 * The cover on the back wall behind a cell: at `strength` along the wall's foot, thinning to nothing at its top.
 * A blockage's sideways fade runs on up the wall from the same edge. Fading in from the north, the cover is clear
 * at the wall's foot, so the wall stays dry.
 */
const washMask = (strength: number, from: readonly Direction[] | undefined, box: Box, span: Box | undefined) => {
  if (from?.includes("n")) return undefined
  const sideways = span ? (from ?? []).filter(dir => dir === "w" || dir === "e") : []
  const layers = [
    `linear-gradient(to top, rgba(0, 0, 0, ${strength}), rgba(0, 0, 0, 0))`,
    ...sideways.map(dir => `linear-gradient(to ${TOWARD[dir]}, rgba(0, 0, 0, 0), black ${CELL}px)`),
  ]
  const style: CSSProperties = {
    maskImage: layers.join(", "),
    maskRepeat: "no-repeat",
    maskSize: ["100% 100%", ...sideways.map(() => `${span!.width}px 100%`)].join(", "),
    maskPosition: ["0 0", ...sideways.map(() => `${span!.left - box.left}px 0`)].join(", "),
    ...(layers.length > 1 ? { maskComposite: "intersect" } : {}),
  }
  return style
}

/** Every drifting layer runs on one clock: its delay places it where a loop started at time zero would be, so
 * cells drawn at different moments stay in step and the texture runs on across them. */
const phaseAt = (now: number, ms: number) => `${-(now % ms)}ms`

/**
 * Rippling texture inside a cell's box, which clips it. Each layer reaches one period past the box on the side it
 * drifts from and slides by exactly that period, a transform the compositor runs without repainting; its texture
 * is anchored at the map's origin like the still cover's.
 */
const Ripple = ({ url, box }: { url: string; box: Box }) => {
  const [now] = useState(() => performance.now())
  return RIPPLE.map(({ layer, units, axis, ms, opacity }) => (
    <div
      key={layer}
      data-ripple-layer={layer}
      className="animate-region-ripple"
      style={
        {
          position: "absolute",
          left: axis === "x" ? -units : 0,
          top: axis === "y" ? -units : 0,
          width: box.width + (axis === "x" ? units : 0),
          height: box.height + (axis === "y" ? units : 0),
          backgroundImage: `url(${url})`,
          backgroundSize: `${units}px ${units}px`,
          backgroundPosition: `${-box.left}px ${-box.top}px`,
          opacity,
          willChange: "transform",
          animationDuration: `${ms}ms`,
          animationDelay: phaseAt(now, ms),
          "--ripple-x": axis === "x" ? `${units}px` : "0px",
          "--ripple-y": axis === "y" ? `${units}px` : "0px",
        } as CSSProperties
      }
    />
  ))
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
          const rippling = "url" in fill && fill.ripple
          const paint = (box: Box): CSSProperties =>
            rippling
              ? { overflow: "hidden" }
              : "url" in fill
                ? {
                    backgroundImage: `url(${fill.url})`,
                    backgroundSize: `${TEXTURE_UNITS}px ${TEXTURE_UNITS}px`,
                    backgroundPosition: `${-box.left}px ${-box.top}px`,
                  }
                : { backgroundColor: fill.color }
          const [r, c] = at
          const walled = (col: number) => !isPassable(grid, claims, r - 1, col, "s")
          // The back wall behind a cell is the face drawn up from the cell's top, a gap wide plus the corner
          // the cover already reaches into on the west, and the corner on the east where the wall ends over a
          // covered neighbour whose own north is open.
          const east =
            covered.has(`${r},${c + 1}`) && isPassable(grid, claims, r, c, "e") && !walled(c + 1) ? SIDE_W : 0
          const wall: Box = { left: box.left, top: cellTop(r) - FACE_H, width: box.width + east, height: FACE_H }
          const behind = walled(c)
          const wash = fill.wash && behind ? washMask(fill.wash, fadeFrom, wall, spans.get(owner)) : undefined
          return (
            <Fragment key={keyOf(at)}>
              <div
                data-cover-cell={keyOf(at)}
                style={{
                  position: "absolute",
                  ...box,
                  ...paint(box),
                  ...(fadeFrom ? fadeIn(fadeFrom, box, spans.get(owner) ?? box) : {}),
                }}
              >
                {rippling && <Ripple url={fill.url} box={box} />}
              </div>
              {wash && (
                <div data-wall-wash={keyOf(at)} style={{ position: "absolute", ...wall, ...paint(wall), ...wash }}>
                  {rippling && <Ripple url={fill.url} box={wall} />}
                </div>
              )}
            </Fragment>
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
