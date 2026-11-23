import { Fragment, useMemo } from "react"
import type { Tileset } from "@/game/siteTypes"
import { CELL, FACE_H, FACE_PATTERN_Y, ROW_PITCH, SILL, WALL_H } from "./mapScale"
import { corridorShade, stateWash, tierPalette, type TierPalette } from "./tileMaterials"
import { tileUrl } from "./tileAssets"
import { LightPoolDefs } from "./ExplorerDot"
import {
  ALL_STATES,
  faceShadowRects,
  faceTopRects,
  grownFaceRects,
  rectsToPath,
  type Rect,
  type TileRegions,
} from "./tileRegions"
import { FACE_SHADOW, FACE_TOP } from "./roomClaims"
import { floorGroups, floorOutline, wornFaceCorners } from "./floorOutline"

/** Natural rock: its floor's outline is worn round rather than cut square (see floorOutline). */
const wornEdges = (tier: Tileset) => tier === "cave"

/** How wide one repeat of a floor or face pattern is on the map. */
export const MEGATILE = CELL * 8

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
  seed,
}: {
  regions: TileRegions
  tier: Tileset
  /** The site's id: a worn edge wanders the same way every time the floor is drawn. */
  seed: string
  /** "x,y" of the sill under every archway, and the arch's own tier. An arch's middle is transparent, so
   * the sill shows THROUGH it — the step the jambs stand on, which is what stops a doorway hovering in a
   * gap with its reveal running straight into floor. The one thing the two disagreed about was stone: a
   * sill takes the tier being ENTERED and an arch the tier of the band it pierces, so at a ward gate the
   * map laid one rank's threshold inside another's gateway. Settled by giving the gap to the arch — an
   * arched sill is drawn in the arch's stone, so an opening is one material. */
  archedGaps?: ReadonlyMap<string, Tileset>
}) => {
  const mega = MEGATILE
  // Every sill that an arch stands in, filed under the ARCH's tier rather than the tier being entered.
  // At a ward gate those differ, and one opening showing two ranks of stone is the reason the sill used to
  // be skipped here entirely.
  const archedSills = new Map<Tileset, Rect[]>()
  for (const [, groups] of regions) {
    for (const rect of groups.threshold) {
      const archTier = archedGaps?.get(`${rect[0]},${rect[1]}`)
      if (!archTier) continue
      const list = archedSills.get(archTier)
      if (list) list.push(rect)
      else archedSills.set(archTier, [rect])
    }
  }
  const { outline: allFloor, fills: floorFills } = useMemo(
    () => floorOutline(floorGroups(regions, wornEdges), seed),
    [regions, seed]
  )
  // The same floor, each cell grown UPWARD by a prop's headroom. Furniture standing off-centre in its
  // cell is cut by the wall beside it and by the wall below it, and still rises into the band above —
  // which is the one direction a prop is meant to cross, so a tall thing occludes the wall behind it
  // instead of being sliced off at its own floor line.
  const tiers = [...regions.keys()]
  // Every face and floor rect on the map, whatever its tier or light: where a worn wall's run ends is a question
  // about its neighbours, which need not share either.
  const allFaces = grownFaceRects(
    [...regions.values()].flatMap(g => ALL_STATES.flatMap(s => [...g.wallFace[s], ...g.frontFace[s]]))
  )
  const allFloorRects = [...regions.values()].flatMap(g =>
    ALL_STATES.flatMap(s => [...g.floorRoom[s], ...g.floorCorridor[s]])
  )

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
                // The face art at its painted 8:1, FACE_H tall, once per row: the pattern repeats on the
                // row pitch and starts where the first row's face does, so every face samples the art
                // from its top whatever the pitch divides into.
                <pattern
                  id={`face-${t}`}
                  y={FACE_PATTERN_Y}
                  width={mega}
                  height={ROW_PITCH}
                  patternUnits="userSpaceOnUse"
                >
                  <image href={face} width={mega} height={FACE_H} preserveAspectRatio="none" />
                </pattern>
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

        {/* THE GROUND FIRST, every tier and light of it, and only then the walls. A face rises
            `FACE_GROW` above its gap over the cell north of it, and that cell may be any tier and any
            light: drawn in one pass, a group painted later laid its floor or its rock over the top of a
            wall drawn earlier. */}
        {tiers.map(t => {
          const palette = tierPalette[t]
          const groups = regions.get(t)!
          const floorFill = tileUrl(t, "floor") ? `url(#floor-${t})` : palette.slab
          return (
            <g key={t}>
              {ALL_STATES.map(state => {
                const wash = stateWash[state]
                const room = floorFills.get(`${t}:room:${state}`)!
                const corridor = floorFills.get(`${t}:corridor:${state}`)!
                const mass = rectsToPath(groups.wallMass[state])
                // Every face's, a front run's too: the shadow lies on the floor in front of the wall,
                // which is the edge that puts the wall above the ground, and nothing ever stands over it.
                const shadows = rectsToPath(
                  faceShadowRects([...groups.wallFace[state], ...groups.frontFace[state]], FACE_SHADOW)
                )
                // A worn corner is a hole in the floor fill, and the wash has to darken what shows through
                // it like the stone around it — so the square floor goes under the wash as well.
                const wornWash = wornEdges(t)
                  ? rectsToPath(groups.floorRoom[state]) + rectsToPath(groups.floorCorridor[state])
                  : ""
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
                    {shadows && <path data-face-shadow="" d={shadows} fill={palette.outline} opacity={0.45} />}
                    {/* The state wash darkens FLOOR only. Stone is masonry, not lighting: a wall or a stretch of
                        rock borrows its state from whichever floor it touches, so a wash on it would cut one
                        run into cell-wide pieces of different darkness. What fog hides is never drawn at all. */}
                    {wash && <path d={room + corridor + wornWash} fill={wash.fill} opacity={wash.opacity} />}
                  </g>
                )
              })}
            </g>
          )
        })}
        {/* THE SILLS, over every tier's ground: a gap's floor belongs to the tier you come from, and a
            tier painted later would otherwise lay its floor over another's sill. One per boundary, not
            one per cell state: it is masonry, not lighting. A sill under an arch is drawn in the ARCH's
            stone, so an opening is one material. */}
        {tiers.map(t => {
          const rects = [
            ...regions.get(t)!.threshold.filter(([x, y]) => !archedGaps?.has(`${x},${y}`)),
            ...(archedSills.get(t) ?? []),
          ]
          return rects.length > 0 && <SillSteps key={t} rects={rects} palette={tierPalette[t]} />
        })}
        {tiers.map(t => {
          const palette = tierPalette[t]
          const groups = regions.get(t)!
          const faceFill = tileUrl(t, "wall-face") ? `url(#face-${t})` : palette.wall
          return (
            <g key={t}>
              {ALL_STATES.map(state => {
                const faces = rectsToPath(grownFaceRects(groups.wallFace[state]))
                const tops = rectsToPath(faceTopRects(groups.wallFace[state], FACE_TOP))
                if (!faces) return null
                return (
                  <g key={state}>
                    {/* The face as it was painted: the art carries its own coping and its own dark base,
                        and the shadow it throws on the floor in front marks the edge. A rank may draw its
                        walls darker than that (`faceNight`), as a look. */}
                    <path data-face="" d={faces} fill={faceFill} />
                    {palette.faceNight > 0 && (
                      <path data-face-night="" d={faces} fill={palette.outline} opacity={palette.faceNight} />
                    )}
                    {/* The wall's own top surface, in the stone the side walls and the wall mass already
                        use: the crisp upper edge of the wall. */}
                    {tops && <path d={tops} fill={palette.wallBase} />}
                    {wornEdges(t) && (
                      <path
                        d={wornFaceCorners(
                          grownFaceRects(groups.wallFace[state]),
                          allFaces,
                          allFloorRects,
                          WALL_H * 0.8
                        )}
                        fill={palette.wallBase}
                      />
                    )}
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

/**
 * A sill as a STEP in the entered tier's stone, built from its palette rather than squashed art: a pale
 * tread with a dark edge on each long side, so a strip a few pixels deep still reads as a stone edge
 * against both floors. The edge on the entered side is the riser and the heavier of the two.
 */
const SillSteps = ({ rects, palette }: { rects: readonly Rect[]; palette: TierPalette }) => {
  const riser = SILL / 3
  const lip = SILL / 8
  // A row seam's sill runs across (the entered floor is below it); a column seam's runs down (entered to the right).
  const across = (r: Rect) => r[2] > r[3]
  const risers = rects.map(([x, y, w, h]): Rect =>
    across([x, y, w, h]) ? [x, y + h - riser, w, riser] : [x + w - riser, y, riser, h]
  )
  const lips = rects.map(([x, y, w, h]): Rect => (across([x, y, w, h]) ? [x, y, w, lip] : [x, y, lip, h]))
  return (
    <g data-sill="">
      <path d={rectsToPath(rects)} fill={palette.wallTop} />
      <path d={rectsToPath(risers)} fill={palette.outline} opacity={0.6} />
      <path d={rectsToPath(lips)} fill={palette.outline} opacity={0.5} />
    </g>
  )
}
