import type { CellState, Tileset } from "@/game/siteTypes"
import {
  CELL,
  COL_PITCH,
  FACE_GROW,
  PAD,
  PAD_TOP,
  PROP_H,
  ROW_PITCH,
  SIDE_W,
  WALL_H,
  cellLeft,
  cellTop,
} from "./mapScale"

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
 * - `{ state, kind, tier }` — the map draws floor here, built of `tier`'s stone. A floor is not all
 *   one tier: a pocket gated behind a junior key is junior stone inside a starter pyramid, and the
 *   gate is the seam where the material changes.
 * - `"unlit"` — a real passage the player has not seen yet. Walled like stone, so its route stays
 *   hidden, EXCEPT at its mouth: the one gap where lit floor meets it stays open, and that opening is
 *   how the map says the way carries on past what has been explored. Leaving its whole length undrawn
 *   traced the corridor instead — direction and length legible without walking it.
 * - `"stone"` — no passage at all. Wall, if anything drawn is next to it.
 */
export type FloorAt = (
  row: number,
  col: number
) => { state: CellState; kind: CellKind; tier: Tileset } | "unlit" | "stone"

/** Whether the player can pass from (row, col) toward `dir`. Adjacency is not passage: a room claims
 * the cells around it, so its floor can sit flush against a corridor it has no way through to. */
export type OpenBetween = (row: number, col: number, dir: "s" | "e") => boolean

/** An SVG rect, ready to become part of a path. */
export type Rect = readonly [x: number, y: number, w: number, h: number]

export type StateGroups = {
  /** the sill laid where this tier's stone meets another's, across a gap the player walks through —
   * so a change of material is an authored threshold rather than an abrupt edge. Keyed on the tier
   * being ENTERED, which is the sill's own stone. */
  threshold: Rect[]
  floorRoom: Record<CellState, Rect[]>
  floorCorridor: Record<CellState, Rect[]>
  /** solid stone: whole cells of it, the corners between them, and side walls seen edge-on */
  wallMass: Record<CellState, Rect[]>
  /** the north gaps you look at, every one of them exactly `WALL_H` tall — and drawn `FACE_GROW` taller,
   * upward, over whatever lies north of the gap (`grownFaceRects`) */
  wallFace: Record<CellState, Rect[]>
  /** the faces of every wall RUN that rises in front of floor — a run with a walkable cell north of any
   * part of it. Drawn over what lies behind it rather than with the stone: see `frontRuns`. */
  frontFace: Record<CellState, Rect[]>
}

/** One set of groups per tier the floor actually holds — the renderer draws each with that tier's own
 * patterns, so a gated pocket of another difficulty is built of its own stone. */
export type TileRegions = Map<Tileset, StateGroups>

export const ALL_STATES: CellState[] = ["fogged", "visible", "reachable", "completed"]

const emptyGroups = (): Record<CellState, Rect[]> =>
  Object.fromEntries(ALL_STATES.map(s => [s, [] as Rect[]])) as Record<CellState, Rect[]>

const emptyStateGroups = (): StateGroups => ({
  floorRoom: emptyGroups(),
  floorCorridor: emptyGroups(),
  wallMass: emptyGroups(),
  wallFace: emptyGroups(),
  frontFace: emptyGroups(),
  threshold: [],
})

// A wall borrows the brightest state around it: a wall between an explored room and an unlit passage
// belongs to the room, or the map would darken the near side of a wall the player stands next to.
const BRIGHTNESS: Record<CellState, number> = { fogged: 0, visible: 1, completed: 2, reachable: 3 }

const brightest = (...states: (CellState | null | undefined)[]): CellState | null =>
  states.reduce<CellState | null>((best, s) => (s && (!best || BRIGHTNESS[s] > BRIGHTNESS[best]) ? s : best), null)

type FloorHere = { state: CellState; kind: CellKind; tier: Tileset } | null

/**
 * Is this gap the MOUTH of an unlit passage — the one gap where lit floor meets it?
 *
 * An unlit passage is stone as far as the walls are concerned and shows only at its mouth. Drawing its
 * whole length as nothing traced the route of a corridor the player has not walked: a black channel
 * through the stone, its direction and length legible, which is exactly what the fog is for. "The way
 * carries on" is a doorway, not a map.
 *
 * A doorway, though — which is why the way has to be OPEN. Without that condition this fired on any
 * boundary where floor happened to sit against an unexplored passage, and blanked it: a treasure
 * chamber with a junior corridor running past its back, walled off from it, lost its whole north wall
 * and read as open to the void. The blank is how the map says "you can go this way", so it may only
 * appear somewhere the player can.
 *
 * Shared by the band and by `hasWallFace` because the two must never disagree about where a wall runs.
 */
const mouthTest =
  (floorAt: FloorAt, openBetween: OpenBetween, floorOf: (r: number, c: number) => FloorHere) =>
  (a: readonly [number, number], b: readonly [number, number], dir: "s" | "e"): boolean =>
    openBetween(a[0], a[1], dir) &&
    ((!!floorOf(...a) && floorAt(...b) === "unlit") || (!!floorOf(...b) && floorAt(...a) === "unlit"))

/** Is the gap north of this cell a wall FACE — the side you look at? Floor below to look at it from,
 * no doorway through it, and no unlit passage you could WALK INTO on either side (a mouth stays open).
 * Exported because a wall item hangs in that band, so the renderer has to ask the same question the
 * band does. */
export const hasWallFace = (floorAt: FloorAt, openBetween: OpenBetween, row: number, col: number): boolean => {
  const floorOf = (r: number, c: number) => {
    const at = floorAt(r, c)
    return typeof at === "string" ? null : at
  }
  const isMouth = mouthTest(floorAt, openBetween, floorOf)
  if (!floorOf(row, col) || isMouth([row - 1, col], [row, col], "s")) return false
  const above = floorOf(row - 1, col)
  return !(above && openBetween(row - 1, col, "s"))
}

export const buildTileRegions = (
  rows: number,
  cols: number,
  floorAt: FloorAt,
  openBetween: OpenBetween,
  /** What stone to use where no floor is in reach to say — the floor's own tier. */
  fallbackTier: Tileset
): TileRegions => {
  const regions: TileRegions = new Map()
  // Every face, held back until the whole floor is walked: whether a face stands in front of floor is a
  // question about its whole RUN, and a run is only known once its last piece is.
  const faces: { groups: StateGroups; state: CellState; rect: Rect; overFloor: boolean }[] = []
  // A rect belongs to the tier of the cell it is part of — the same cell its STATE comes from, so
  // material and light never disagree about which room a rect belongs to.
  const groupsFor = (tier: Tileset): StateGroups => {
    const existing = regions.get(tier)
    if (existing) return existing
    const fresh = emptyStateGroups()
    regions.set(tier, fresh)
    return fresh
  }
  const tierAt = (...cells: readonly (readonly [number, number])[]): Tileset => {
    for (const [r, c] of cells) {
      const cell = floorOf(r, c)
      if (cell) return cell.tier
    }
    return fallbackTier
  }
  const floorOf = (r: number, c: number) => {
    const at = floorAt(r, c)
    return typeof at === "string" ? null : at
  }
  const stateOf = (r: number, c: number) => floorOf(r, c)?.state ?? null
  // A wall rect is lit by the floor it actually TOUCHES, and by nothing further away. Asking a
  // 3x3 around two cells at once reached two cells out, which drew a band of stone around every
  // corridor twice as thick as the wall it stands for.
  const litTouching = (...cells: readonly (readonly [number, number])[]) =>
    brightest(...cells.map(([r, c]) => stateOf(r, c)))
  const isMouth = mouthTest(floorAt, openBetween, floorOf)
  /** The eight cells that can give a square of bare rock a reason to be drawn. */
  const ringAround = (r: number, c: number) =>
    [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
      [r - 1, c - 1],
      [r - 1, c + 1],
      [r + 1, c - 1],
      [r + 1, c + 1],
    ] as const
  /**
   * WHETHER A CELL IS DRAWN AT ALL, and under which state — floor if it has one, otherwise mass when
   * something drawn touches it.
   *
   * THE SEAMS BETWEEN CELLS HAVE TO ASK THE SAME QUESTION THE CELLS DO. They used to ask a smaller one:
   * a square of rock looked at all eight neighbours, the gap above it at six (never the row below), and
   * the corner at four. So a square drawn because the cell BELOW it was lit sat against a gap that was
   * not drawn at all, and the map came out as blocks of stone with black slits between them — 18 such
   * seams on a walked starter floor, 9 on expert, worst at the corners where the test was narrowest.
   */
  const drawnState = (r: number, c: number): CellState | null =>
    floorOf(r, c)?.state ?? litTouching(...ringAround(r, c))
  // Asked by the gap itself AND by the corners beside it, so the two can never disagree about where a
  // wall band runs — and by the renderer, to find a cell with a band to hang a wall item on.
  const isFaceGap = (r: number, c: number): boolean => hasWallFace(floorAt, openBetween, r, c)
  const floorGroup = (groups: StateGroups, ...cells: ({ kind: CellKind } | null)[]) =>
    cells.every(cell => cell?.kind === "room") ? groups.floorRoom : groups.floorCorridor

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
        floorGroup(groupsFor(here.tier), here)[here.state].push([x, y, CELL, CELL])
      } else {
        // Mass wherever stone touches something drawn, and nothing at all otherwise — bare rock the
        // map has never had a reason to show. An unlit passage is stone here too, so its route stays
        // hidden; only its mouth shows, below.
        const around = ringAround(r, c)
        const lit = litTouching(...around)
        if (lit) groupsFor(tierAt(...around)).wallMass[lit].push([x, y, CELL, CELL])
      }

      // ── the north gap: floor when the way is open, otherwise the face you look at ──
      const northGap: Rect = [x, y - WALL_H, CELL, WALL_H]
      if (here && north && openBetween(r - 1, c, "s")) {
        const groups = groupsFor(tierAt([r, c], [r - 1, c]))
        floorGroup(groups, here, north)[brightest(here.state, north.state)!].push(northGap)
        if (here.tier !== north.tier) groupsFor(here.tier).threshold.push(northGap)
      } else if (isMouth([r - 1, c], [r, c], "s")) {
        // The mouth of an unexplored passage. Left black on purpose: that opening is how the map says
        // the way carries on past what has been explored.
      } else if (isFaceGap(r, c)) {
        faces.push({
          groups: groupsFor(tierAt([r, c], [r - 1, c])),
          state: brightest(here!.state, north?.state)!,
          rect: northGap,
          overFloor: !!north,
        })
      } else {
        // The seam between this square and the one above it: drawn whenever BOTH are, so a run of rock
        // reads as rock rather than as bricks with the mortar missing.
        const around = [
          [r - 1, c],
          [r, c],
        ] as const
        const lit = brightest(drawnState(r, c), drawnState(r - 1, c))
        if (lit) groupsFor(tierAt(...around, [r - 1, c - 1], [r, c - 1])).wallMass[lit].push(northGap)
      }

      // ── the west gap: floor when the way is open, otherwise a side wall seen edge-on ──
      const westGap: Rect = [x - SIDE_W, y, SIDE_W, CELL]
      if (here && west && openBetween(r, c - 1, "e")) {
        const groups = groupsFor(tierAt([r, c], [r, c - 1]))
        floorGroup(groups, here, west)[brightest(here.state, west.state)!].push(westGap)
        if (here.tier !== west.tier) groupsFor(here.tier).threshold.push(westGap)
      } else if (isMouth([r, c - 1], [r, c], "e")) {
        // Same mouth, sideways.
      } else {
        // The same seam turned sideways — see the north gap above.
        const around = [
          [r, c],
          [r, c - 1],
        ] as const
        const lit = brightest(drawnState(r, c), drawnState(r, c - 1))
        if (lit) groupsFor(tierAt(...around, [r - 1, c], [r - 1, c - 1])).wallMass[lit].push(westGap)
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
      const cornerCells = [
        [r, c],
        [r - 1, c],
        [r, c - 1],
        [r - 1, c - 1],
      ] as const
      // The corner asks the same question the four squares around it do: a pinhole of background where
      // four drawn squares meet is the most visible seam of the three, because it has stone on all sides.
      const cornerLit = brightest(...cornerCells.map(([cr, cc]) => drawnState(cr, cc)))
      const cornerGroups = groupsFor(tierAt(...cornerCells))
      if (insideOneSpace) {
        floorGroup(cornerGroups, here, north, west, northWest)[
          brightest(here.state, north.state, west.state, northWest.state)!
        ].push(corner)
      } else if (cornerLit) {
        if (continuesFaceRun) faces.push({ groups: cornerGroups, state: cornerLit, rect: corner, overFloor: false })
        else cornerGroups.wallMass[cornerLit].push(corner)
      }
    }
  }

  // A run is the faces that meet end to end along one gap row. The whole run stands in front when any
  // part of it does, so a wall fades as one wall rather than as the cells somebody stands behind.
  const gapRows = new Map<number, typeof faces>()
  for (const face of faces) gapRows.set(face.rect[1], [...(gapRows.get(face.rect[1]) ?? []), face])
  for (const row of gapRows.values()) {
    row.sort((a, b) => a.rect[0] - b.rect[0])
    let run: typeof faces = []
    const flush = () => {
      const front = run.some(f => f.overFloor)
      for (const f of run) (front ? f.groups.frontFace : f.groups.wallFace)[f.state].push(f.rect)
      run = []
    }
    for (const face of row) {
      const last = run.at(-1)
      if (last && last.rect[0] + last.rect[2] !== face.rect[0]) flush()
      run.push(face)
    }
    flush()
  }

  return regions
}

/** One closed rectangle per entry, as a single path. */
/**
 * Rectangles as one path, optionally in a frame of their own.
 *
 * `origin` shifts every coordinate, which is what lets a clipped layer be the size of its OWN content
 * rather than the size of the map. A `clip-path` resolves in the element's box, so an element that spans
 * the whole map has to be RASTERISED at the whole map's size — on a phone, at three device pixels to the
 * unit, that is tens of megabytes per layer and a renderer that gets killed (it did: v0.43.1 crashed
 * entering any floor on iOS). Bounded to its own box, the same drawing costs what it covers.
 */
export const rectsToPath = (rects: readonly Rect[], origin: readonly [number, number] = [0, 0]): string =>
  rects.map(([x, y, w, h]) => `M${x - origin[0]} ${y - origin[1]}h${w}v${h}h${-w}z`).join("")

/** The box a run of rectangles covers: where a layer cut to them has to sit, and how big it has to be. */
export const boundsOf = (rects: readonly Rect[]): { x: number; y: number; w: number; h: number } => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y, w, h] of rects) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** The hard shadow a face throws onto the floor in front of it. In this idiom that shadow, not any
 * shading on the floor itself, is what puts the wall above the ground. */
export const faceShadowRects = (faces: readonly Rect[], height: number): Rect[] =>
  faces.map(([x, y, w, h]) => [x, y + h, w, height])

/**
 * The strip along the TOP of a wall face: the wall's own top surface, seen from above.
 *
 * A face is the side of a wall you look at, and a wall has thickness, so above every face there is a
 * sliver of its top — the same surface the side walls show edge-on, in the same stone. Without it a wall
 * run is a flat band of brick with nothing above it, and the map loses the one cue that says a wall is a
 * solid thing rather than a painted line.
 */
export const faceTopRects = (faces: readonly Rect[], depth: number): Rect[] =>
  grownFaceRects(faces).map(([x, y, w]) => [x, y, w, depth])

/** A face as it is DRAWN: its gap, plus `FACE_GROW` rising above it over whatever lies north. */
export const grownFaceRects = (faces: readonly Rect[]): Rect[] =>
  faces.map(([x, y, w, h]) => [x, y - FACE_GROW, w, h + FACE_GROW])

/** One piece of a front run: a face's gap, with the stone and the light it is drawn in. */
export type FrontPiece = { rect: Rect; tier: Tileset; state: CellState }

/**
 * A run of back wall that rises in front of floor, as one thing the renderer can fade.
 *
 * `behind` is every cell a face of the run rises over, so "is anyone behind this wall" is one lookup.
 * Corner pieces rise over the seam between two of those cells and add none of their own.
 */
export type FrontRun = { key: string; pieces: FrontPiece[]; bounds: Rect; behind: ReadonlySet<string> }

/** The front faces of a floor, gathered back into the runs they were cut from. */
export const frontRuns = (regions: TileRegions): FrontRun[] => {
  const pieces = [...regions].flatMap(([tier, groups]) =>
    ALL_STATES.flatMap(state => groups.frontFace[state].map(rect => ({ rect, tier, state })))
  )
  pieces.sort((a, b) => a.rect[1] - b.rect[1] || a.rect[0] - b.rect[0])
  const runs: FrontPiece[][] = []
  for (const piece of pieces) {
    const run = runs.at(-1)
    const last = run?.at(-1)
    if (run && last && last.rect[1] === piece.rect[1] && last.rect[0] + last.rect[2] === piece.rect[0]) run.push(piece)
    else runs.push([piece])
  }
  return runs.map(run => {
    const box = boundsOf(grownFaceRects(run.map(p => p.rect)))
    const behind = new Set(
      run
        .filter(p => p.rect[2] === CELL)
        .map(({ rect: [x, y] }) => `${(y - PAD_TOP) / ROW_PITCH - 1},${(x - PAD - SIDE_W) / COL_PITCH}`)
    )
    return { key: `${box.x},${box.y}`, pieces: run, bounds: [box.x, box.y, box.w, box.h], behind }
  })
}

/** A room's own footprint as a clip path: each of its cells, grown upward by a prop's headroom so a
 * tall thing still crosses the wall band behind it.
 *
 * AND THE SEAMS BETWEEN THEM. Cells do not touch — `cellLeft`/`cellTop` leave `SIDE_W` between columns
 * and `WALL_H` between rows for the walls seen edge-on — so a clip built from cell rects alone has a
 * hairline of nothing down every join. Furniture standing wholly inside one cell never met it; the ward
 * gate, which straddles a seam on purpose because that is where its sill is laid, came out with the
 * strip containing its bars cut clean away and its two jambs drawn as separate posts.
 */
export const footprintRects = (cells: readonly string[]): Rect[] => {
  const own = cells.map(key => key.split(",").map(Number) as [number, number])
  const has = new Set(cells)
  const rects: Rect[] = own.map(([r, c]) => [cellLeft(c), cellTop(r) - PROP_H, CELL, CELL + PROP_H])
  for (const [r, c] of own) {
    // Each seam once: only ever to the east and to the south, so a pair of cells cannot add it twice.
    if (has.has(`${r},${c + 1}`)) rects.push([cellLeft(c) + CELL, cellTop(r) - PROP_H, SIDE_W, CELL + PROP_H])
    if (has.has(`${r + 1},${c}`)) rects.push([cellLeft(c), cellTop(r) + CELL - PROP_H, CELL, WALL_H + PROP_H])
  }
  return rects
}

/** The same shape as one path, for the tests that read it and for anything that wants it whole. */
export const footprintPath = (cells: readonly string[]): string => rectsToPath(footprintRects(cells))
