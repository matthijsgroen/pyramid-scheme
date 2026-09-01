import type { CellState } from "@/game/siteTypes"
import { CELL, SIDE_W, WALL_H, cellLeft, cellTop } from "./mapScale"

// Which rectangles the sprite renderer paints, grouped so each group becomes ONE filled path
// instead of a rect per cell. Pure and grid-shaped: it knows nothing about SVG, claims or fog rules
// — the caller answers what each cell is through `floorAt`, and whether an edge can be walked
// through with `openBetween`.
//
// The wall model (docs/game-design/spritesheet-renderer-prep.md, "Perspective"): a wall is never an
// edge, it is always a place. The map is laid out on a stretched pitch (mapScale.ts) where every
// cell carries a tall gap on its north side and a thin one on its west, and each gap is either
// floor — the player walks through — or wall. So:
//
// - a north gap is a wall FACE, the side you look at, and every face in the map is the same height
// - a west gap is a side wall, seen edge-on, so only its thickness shows
// - the corner where four cells meet carries the band across a room, and is the side wall's own top
//   where one stands in front of it: a side wall runs south, toward the viewer, so it occludes the
//   back wall rather than the band wrapping around it
// - a whole cell of stone is mass too, so a thick wall is simply more of it
//
// Nothing is ever squeezed onto a zero-width boundary, which is what made walls read at two
// different sizes — a full face in one place and a thin bar in another.

export type CellKind = "room" | "corridor"

/**
 * - `{ state, kind }` — the map draws floor here.
 * - `"unlit"` — a real passage the player has not seen yet. Nothing is drawn, and it is deliberately
 *   NOT walled: an opening onto black is how the map says the way carries on past what has been
 *   explored. Walling it would claim the passage is solid stone.
 * - `"stone"` — no passage at all. Wall, if anything drawn is next to it.
 */
export type FloorAt = (row: number, col: number) => { state: CellState; kind: CellKind } | "unlit" | "stone"

/** Whether the player can pass from (row, col) toward `dir`. Adjacency is not passage: a room claims
 * the cells around it, so its floor can sit flush against a corridor it has no way through to. */
export type OpenBetween = (row: number, col: number, dir: "s" | "e") => boolean

/** An SVG rect, ready to become part of a path. */
export type Rect = readonly [x: number, y: number, w: number, h: number]

export type TileRegions = {
  floorRoom: Record<CellState, Rect[]>
  floorCorridor: Record<CellState, Rect[]>
  /** solid stone: whole cells of it, the corners between them, and side walls seen edge-on */
  wallMass: Record<CellState, Rect[]>
  /** the north gaps you look at, every one of them exactly `WALL_H` tall */
  wallFace: Record<CellState, Rect[]>
}

export const ALL_STATES: CellState[] = ["fogged", "visible", "reachable", "completed"]

const emptyGroups = (): Record<CellState, Rect[]> =>
  Object.fromEntries(ALL_STATES.map(s => [s, [] as Rect[]])) as Record<CellState, Rect[]>

// A wall borrows the brightest state around it: a wall between an explored room and an unlit passage
// belongs to the room, or the map would darken the near side of a wall the player stands next to.
const BRIGHTNESS: Record<CellState, number> = { fogged: 0, visible: 1, completed: 2, reachable: 3 }

const brightest = (...states: (CellState | null | undefined)[]): CellState | null =>
  states.reduce<CellState | null>((best, s) => (s && (!best || BRIGHTNESS[s] > BRIGHTNESS[best]) ? s : best), null)

export const buildTileRegions = (
  rows: number,
  cols: number,
  floorAt: FloorAt,
  openBetween: OpenBetween
): TileRegions => {
  const regions: TileRegions = {
    floorRoom: emptyGroups(),
    floorCorridor: emptyGroups(),
    wallMass: emptyGroups(),
    wallFace: emptyGroups(),
  }
  const floorOf = (r: number, c: number) => {
    const at = floorAt(r, c)
    return typeof at === "string" ? null : at
  }
  const stateOf = (r: number, c: number) => floorOf(r, c)?.state ?? null
  // A wall rect is lit by whatever floor lies around the cells it belongs to. Asking a wide enough
  // neighbourhood is what stops a gap between two stone cells from being left unpainted — a black
  // slot through the middle of a wall run.
  const litAround = (...cells: readonly (readonly [number, number])[]) =>
    brightest(...cells.flatMap(([r, c]) => [-1, 0, 1].flatMap(dr => [-1, 0, 1].map(dc => stateOf(r + dr, c + dc)))))
  const isUnlit = (r: number, c: number) => floorAt(r, c) === "unlit"
  // Is the gap north of this cell a wall face? Floor below to look at it from, no doorway through it,
  // and no unlit passage on either side. Asked by the gap itself AND by the corners beside it, so the
  // two can never disagree about where a wall band runs.
  const isFaceGap = (r: number, c: number): boolean => {
    if (!floorOf(r, c) || isUnlit(r - 1, c) || isUnlit(r, c)) return false
    const above = floorOf(r - 1, c)
    return !(above && openBetween(r - 1, c, "s"))
  }
  const floorGroup = (...cells: ({ kind: CellKind } | null)[]) =>
    cells.every(cell => cell?.kind === "room") ? regions.floorRoom : regions.floorCorridor

  // One ring beyond the grid, so a passage on the map's edge still gets a wall to look at rather
  // than ending in open background.
  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const x = cellLeft(c)
      const y = cellTop(r)
      const here = floorOf(r, c)
      const north = floorOf(r - 1, c)
      const west = floorOf(r, c - 1)

      // ── the cell's own floor square ──
      if (here) {
        floorGroup(here)[here.state].push([x, y, CELL, CELL])
      } else if (floorAt(r, c) === "stone") {
        // Mass wherever stone touches something drawn, and nothing at all otherwise — bare rock the
        // map has never had a reason to show.
        const lit = litAround([r, c])
        if (lit) regions.wallMass[lit].push([x, y, CELL, CELL])
      }

      // ── the north gap: floor when the way is open, otherwise the face you look at ──
      const northGap: Rect = [x, y - WALL_H, CELL, WALL_H]
      if (here && north && openBetween(r - 1, c, "s")) {
        floorGroup(here, north)[brightest(here.state, north.state)!].push(northGap)
      } else if (isUnlit(r - 1, c) || isUnlit(r, c)) {
        // The mouth of an unexplored passage. Left black on purpose: that opening is how the map says
        // the way carries on past what has been explored.
      } else if (isFaceGap(r, c)) {
        regions.wallFace[brightest(here!.state, north?.state)!].push(northGap)
      } else {
        const lit = litAround([r, c], [r - 1, c])
        if (lit) regions.wallMass[lit].push(northGap)
      }

      // ── the west gap: floor when the way is open, otherwise a side wall seen edge-on ──
      const westGap: Rect = [x - SIDE_W, y, SIDE_W, CELL]
      if (here && west && openBetween(r, c - 1, "e")) {
        floorGroup(here, west)[brightest(here.state, west.state)!].push(westGap)
      } else if (isUnlit(r, c - 1) || isUnlit(r, c)) {
        // Same mouth, sideways.
      } else {
        const lit = litAround([r, c], [r, c - 1])
        if (lit) regions.wallMass[lit].push(westGap)
      }

      // ── the corner where four cells meet ──
      // Part of the wall band when the faces either side of it are, so a back wall reads as one
      // continuous run instead of a dashed line of separate faces. Mass otherwise, which is what
      // gives a doorway its jamb.
      const corner: Rect = [x - SIDE_W, y - WALL_H, SIDE_W, WALL_H]
      // The corner joins the wall band whenever EITHER neighbouring gap is a face. Demanding both
      // left the band `SIDE_W` short at every end of a run — a back wall that stopped before the
      // room did, finished off with a patch of flat colour where the side wall met it.
      // A side wall runs SOUTH, toward the viewer, so it stands in FRONT of the back wall: where one
      // meets a band, the corner is that side wall's own top and the band ends behind it. The band only
      // carries through a corner where nothing stands in front — i.e. where the space below the corner
      // is floor, which is the middle of a room's own width.
      const nothingStandsInFront = !!here && !!west && openBetween(r, c - 1, "e")
      const continuesFaceRun = (isFaceGap(r, c) || isFaceGap(r, c - 1)) && nothingStandsInFront
      // Inside ONE space, the corner is floor. A chamber claims the cells around it, so four floor
      // cells meet at each of its interior corners — filled with mass they read as four little walls
      // standing in the middle of the room, which is what a 3x3 footprint used to look like.
      const northWest = floorOf(r - 1, c - 1)
      const insideOneSpace =
        !!here &&
        !!north &&
        !!west &&
        !!northWest &&
        openBetween(r - 1, c, "s") &&
        openBetween(r, c - 1, "e") &&
        openBetween(r - 1, c - 1, "s") &&
        openBetween(r - 1, c - 1, "e")
      const cornerLit = litAround([r, c], [r - 1, c - 1])
      if (insideOneSpace) {
        floorGroup(here, north, west, northWest)[brightest(here.state, north.state, west.state, northWest.state)!].push(
          corner
        )
      } else if (cornerLit) {
        const group = continuesFaceRun ? regions.wallFace : regions.wallMass
        group[cornerLit].push(corner)
      }
    }
  }

  return regions
}

/** One closed rectangle per entry, as a single path. */
export const rectsToPath = (rects: readonly Rect[]): string =>
  rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("")

/** The hard shadow a face throws onto the floor in front of it. In this idiom that shadow, not any
 * shading on the floor itself, is what puts the wall above the ground. */
export const faceShadowsToPath = (faces: readonly Rect[], height: number): string =>
  faces.map(([x, y, w, h]) => `M${x} ${y + h}h${w}v${height}h${-w}z`).join("")
