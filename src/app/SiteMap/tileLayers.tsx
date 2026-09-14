import { Fragment } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { CELL, SIDE_W, WALL_H } from "./mapScale"
import { corridorShade, stateWash, tierPalette } from "./tileMaterials"
import { tileUrl } from "./tileAssets"
import { LightPoolDefs } from "./ExplorerDot"
import { ALL_STATES, faceShadowRects, faceTopRects, rectsToPath, type Rect, type TileRegions } from "./tileRegions"
import { FACE_SHADOW, FACE_TOP } from "./roomClaims"

// THE STONE ITSELF: floor, wall mass, faces, tops, sills, shadows and the state washes over them, as
// merged paths rather than a shape per cell — a floor's whole masonry is 22 elements, and that is the
// whole reason the map is affordable on a phone (docs/instructions/map-rendering.md).

// ─── Tile layers ────────────────────────────────────────────────────────────────
// Floors and walls are painted as a handful of pattern-filled paths under the whole map rather
// than a rect per cell — see tileRegions.ts for the model and
// docs/game-design/spritesheet-renderer-prep.md for why.

/**
 * THE STONE IS ONE SVG, and that is a memory fact rather than a taste.
 *
 * Everything that MOVES on this map is HTML and composited (docs/instructions/map-rendering.md). The
 * stone does not move, and it is the one thing whose shapes span the whole floor: a merged run of floor
 * or wall covers most of a map that can be 1876x2268 CSS px. As HTML that is one `clip-path` layer per
 * group, and a clipped element has to be rasterised at its OWN size — 22 of them at three device pixels
 * to the unit came to gigabytes, and iOS Safari killed the tab on entry to any floor (v0.43.1). One
 * `<svg>` is one surface the compositor tiles as ordinary content, which is what shipped before and what
 * ships again.
 *
 * A sprite is different: it is cut to ONE ROOM, so its layer is a room's worth of pixels, and those stay
 * HTML.
 */
export const TileLayers = ({
  regions,
  tier,
  archedGaps,
}: {
  regions: TileRegions
  tier: Difficulty
  /** "x,y" of every gap an archway stands in, and the arch's own tier. An arch's middle is transparent, so
   * the sill shows THROUGH it — the step the jambs stand on, which is what stops a doorway hovering in a
   * gap with its reveal running straight into floor. The one thing the two disagreed about was stone: a
   * sill takes the tier being ENTERED and an arch the tier of the band it pierces, so at a ward gate the
   * map laid one rank's threshold inside another's gateway. Settled by giving the gap to the arch — an
   * arched sill is drawn in the arch's stone, so an opening is one material. */
  archedGaps?: ReadonlyMap<string, Difficulty>
}) => {
  const mega = CELL * 8
  // Every sill that an arch stands in, filed under the ARCH's tier rather than the tier being entered.
  // At a ward gate those differ, and one opening showing two ranks of stone is the reason the sill used to
  // be skipped here entirely.
  const archedSills = new Map<Difficulty, Rect[]>()
  for (const [, groups] of regions) {
    for (const rect of groups.threshold) {
      const archTier = archedGaps?.get(`${rect[0]},${rect[1]}`)
      if (!archTier) continue
      const list = archedSills.get(archTier)
      if (list) list.push(rect)
      else archedSills.set(archTier, [rect])
    }
  }
  const floorRects = [...regions.values()].flatMap(groups => [
    ...Object.values(groups.floorRoom).flat(),
    ...Object.values(groups.floorCorridor).flat(),
  ])
  const allFloor = rectsToPath(floorRects)
  // The same floor, each cell grown UPWARD by a prop's headroom. Furniture standing off-centre in its
  // cell is cut by the wall beside it and by the wall below it, and still rises into the band above —
  // which is the one direction a prop is meant to cross, so a tall thing occludes the wall behind it
  // instead of being sliced off at its own floor line.
  const tiers = [...regions.keys()]

  return (
    <>
      <defs>
        {/* The walkable floor as a CLIP. Sand is drawn larger than a cell and cut to this, so a drift
            crosses cells and stops dead at a wall — see `driftsFor`. The path is the same one the
            outline stroke below uses; it costs nothing to reuse it. */}
        <clipPath id="walkable-floor">
          <path d={allFloor} />
        </clipPath>
        {tiers.map(t => {
          const floor = tileUrl(t, "floor")
          const face = tileUrl(t, "wall-face")
          const sill = tileUrl(t, "threshold")
          return (
            <Fragment key={t}>
              {floor && (
                <pattern id={`floor-${t}`} width={mega} height={mega} patternUnits="userSpaceOnUse">
                  {/* preserveAspectRatio="none": an <image> letterboxes itself by default, which leaves the
                      rest of the pattern tile transparent — black slots in the middle of a wall. */}
                  <image href={floor} width={mega} height={mega} preserveAspectRatio="none" />
                </pattern>
              )}
              {face && (
                // The face art is a cell tall; a face is WALL_H tall, so the pattern is scaled to that
                // and repeats on it. Every face in the map then shows the same courses at the same height.
                <pattern id={`face-${t}`} width={mega} height={WALL_H} patternUnits="userSpaceOnUse">
                  <image href={face} width={mega} height={WALL_H} preserveAspectRatio="none" />
                </pattern>
              )}
              {sill && (
                <>
                  {/* A sill fills the GAP it is laid in, and there are two shapes of gap. Between two rows
                      it is a cell wide and a wall band deep, which is how the art is drawn. Between two
                      columns it is the same step turned ninety degrees into a side wall's thickness — one
                      pattern stretched over both is how a step ended up lying on its side. */}
                  <pattern id={`sill-h-${t}`} width={CELL} height={WALL_H} patternUnits="userSpaceOnUse">
                    <image href={sill} width={CELL} height={WALL_H} preserveAspectRatio="none" />
                  </pattern>
                  <pattern id={`sill-v-${t}`} width={SIDE_W} height={CELL} patternUnits="userSpaceOnUse">
                    <image
                      href={sill}
                      width={CELL}
                      height={SIDE_W}
                      transform={`translate(${SIDE_W},0) rotate(90)`}
                      preserveAspectRatio="none"
                    />
                  </pattern>
                </>
              )}
            </Fragment>
          )
        })}
        <LightPoolDefs />
      </defs>

      <g>
        {/* The near-black silhouette that stops a wall mass and a lit floor of similar value from
            blurring into each other. Stroked UNDER the fills, on the whole floor at once: a stroke
            drawn on top would trace every cell's border and put a grid over the floor, while
            underneath only the outward half of the outline survives, which is the silhouette. */}
        <path d={allFloor} fill="none" stroke={tierPalette[tier].outline} strokeWidth={4} />

        {tiers.map(t => {
          const palette = tierPalette[t]
          const groups = regions.get(t)!
          const floorFill = tileUrl(t, "floor") ? `url(#floor-${t})` : palette.slab
          const faceFill = tileUrl(t, "wall-face") ? `url(#face-${t})` : palette.wall
          const hasSill = !!tileUrl(t, "threshold")
          // A gap between two ROWS is a cell wide; one between two columns is a side wall's thickness.
          const sillFill = ([, , w]: Rect) => (hasSill ? `url(#sill-${w === CELL ? "h" : "v"}-${t})` : palette.wallTop)
          return (
            <g key={t}>
              {ALL_STATES.map(state => {
                const wash = stateWash[state]
                const room = rectsToPath(groups.floorRoom[state])
                const corridor = rectsToPath(groups.floorCorridor[state])
                const mass = rectsToPath(groups.wallMass[state])
                const faces = rectsToPath(groups.wallFace[state])
                const shadows = rectsToPath(faceShadowRects(groups.wallFace[state], FACE_SHADOW))
                const tops = rectsToPath(faceTopRects(groups.wallFace[state], FACE_TOP))
                // One sill per boundary, not one per cell state: it is masonry, not lighting. A sill under
                // an arch is drawn with the ARCH's tier rather than this one, so it is handled below.
                const thresholds = groups.threshold.filter(([x, y]) => !archedGaps?.has(`${x},${y}`))
                const arched = archedSills.get(t) ?? []
                return (
                  <g key={state}>
                    {mass && <path d={mass} fill={palette.wallBase} />}
                    {room && <path d={room} fill={floorFill} />}
                    {corridor && (
                      <>
                        <path d={corridor} fill={floorFill} />
                        <path d={corridor} fill={corridorShade.fill} opacity={corridorShade.opacity} />
                      </>
                    )}
                    {faces && <path d={faces} fill={faceFill} />}
                    {/* A wall stands in less light than the ground does — a lamp is carried at floor
                        level, so a vertical face takes it at a glancing angle. Without this the two
                        planes land within a step of each other once the night is over both, and a room
                        reads as a floorplan with a change of texture rather than as a place with walls.
                        See `faceNight`: it is solved per rank to the same rendered step, because the
                        art's own step runs from 6.8 to 22.7 and it is what the PLAYER sees that has to
                        agree between the ranks. */}
                    {faces && <path data-face-night="" d={faces} fill={palette.outline} opacity={palette.faceNight} />}
                    {/* The wall's own top surface, in the stone the side walls and the wall mass already
                        use. A face without it is a band of brick with nothing above it, and a wall stops
                        reading as a solid thing. */}
                    {tops && <path d={tops} fill={palette.wallBase} />}
                    {/* Laid over the floor of the gap it crosses, so a change of material reads as a
                        step between two places rather than a line where the art changes. */}
                    {/* One path per sill: each takes the pattern for the shape of gap it lies in. The sill
                        an arch stands in is drawn here too, in the ARCH's stone rather than the entered
                        tier's, which is why it is filed under this tier at all. */}
                    {state === "reachable" &&
                      [...thresholds, ...arched].map(rect => (
                        <path key={rect.join(",")} d={rectsToPath([rect])} fill={sillFill(rect)} opacity={0.9} />
                      ))}
                    {shadows && <path d={shadows} fill={palette.outline} opacity={0.45} />}
                    {wash && <path d={room + corridor + faces + mass} fill={wash.fill} opacity={wash.opacity} />}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
    </>
  )
}
