import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import type {
  CellState,
  DecorationKind,
  Difficulty,
  Direction,
  FloorGrid,
  Patron,
  WallDecorationKind,
} from "../../game/siteTypes"
import { wardKeyDifficulty } from "../../data/difficultyLevels"
import { isSealedWayOut, oneWayRuns, revealAll } from "../../game/gridNavigation"
import { ExplorerDot, LightPool } from "./ExplorerDot"
import { RiderSprite, ZiplineRider } from "./ZiplineRider"
import { poseFor, type RidePoses } from "./ridePoses"
import type { Ride } from "./useZiplineRide"
import { SqueezeRider } from "./SqueezeRider"
import type { Squeeze } from "./useSqueeze"
import { driftsFor, grassMatsFor, scatterFor, type Drift, type ScatterKind } from "./floorScatter"
import { useMapZoom } from "./useMapZoom"
import {
  CELL,
  dropFrame,
  dropFloorLine,
  MARKER_RADIUS,
  ARCH_H,
  ARCH_DROP,
  ARCH_RISE,
  ARCH_W,
  SIDE_W,
  WALL_H,
  cellCenter,
  cellLeft,
  cellTop,
  mapHeight,
  mapWidth,
  PROP_H,
} from "./mapScale"
import { DROP_ART, LOOTED_OPACITY, NODE_OVER_ART_OPACITY, nodeArtOffset, type NodeSprite } from "./nodeArt"
import { stateWash, tierPalette } from "./tileMaterials"
import { ClipLayer, OCCLUDER_FADE, Sprite } from "./htmlLayers"
import { moodFor, growthTile } from "./moodSettings"
import { cellAt } from "@/game/roomFootprint"
import { MapGrowth, MapLife, MapWeather } from "./MapMood"
import { hashString } from "@/support/hashString"
import {
  ART_IMAGE_RENDERING,
  patronTileUrl,
  tileOrPlaceholder,
  tileUrl,
  tileVariants,
  sharedTileUrl,
} from "./tileAssets"
import { storedAtCell } from "@/game/cellAddress"
import { tileStatusAt } from "@/game/sequencePlay"
import { explorerWeight, isCarrying, plateLookAt, type ExplorerWeight } from "@/game/stonePlay"
import { passageArtUrl } from "./passageArt"
import { PLATE_TILE } from "./plateArt"
import { drawingOf, familyIconOf, isLockedGate, isSpentAt, nodeRadius, shapeKindFor, staysOpen } from "./nodeKinds"
import { MapActionPrompt } from "@/ui/atoms/MapActionPrompt"
import { MapNotice } from "@/ui/atoms/MapNotice"
import { CompletedBadge, NodeBadge, NodeShape, PendingLootBadge } from "./nodeShapes"
import { MarkArtBadge, type Mark } from "./mark"
import { FloorShade, LitPlaces } from "./torchlight"
import {
  SEATING_PASS,
  STANDING_RELIEF,
  beamShafts,
  floorNight,
  lampStandingStrength,
  lampStrength,
  litPlaceCells,
} from "./lighting"
import { BeamLight, BeamShafts } from "./MapBeams"
import { TileLayers } from "./tileLayers"
import { regionBarrierCovers } from "@/game/regionBarrierCover"
import { RegionBarrierCovers } from "./RegionBarrierCovers"
import { useRegionBarrierCovers } from "./useRegionBarrierCovers"
import { buildOfferContext, clickTargetAt, markerAt, type OfferContext, type OfferMarker } from "./clickTargets"
import {
  FACE_SHADOW,
  allFloorRects,
  buildRoomClaims,
  cellFloorAt,
  floorTier,
  isPassable,
  litClaimOwner,
  tileRegionsFor,
  type RoomClaims,
} from "./roomClaims"
import { DIR_MOVES } from "./corridorRuns"
import { footprintRects, hasWallFace } from "./tileRegions"
import type { Rect } from "./tileRegions"
import type { FloorAt } from "./tileRegions"

// Cells one step outside the grid are still real void for claiming purposes — a fork or
// endpoint sitting on the map's edge shouldn't look artificially clipped next to one
// that happens to have interior void around it. Anything beyond the grid is `empty`.

type Props = {
  grid: FloorGrid
  onCellClick?: (row: number, col: number) => void
  revealAllCells?: boolean
  /** Every floor cell is a click target, corridors included, and the run rules are set aside.
   *
   * For an EXHIBIT rather than a run: judging art means standing the explorer wherever the art is,
   * and in play only a corridor's CORNER is clickable (a straight passage borrows a far corner's
   * target), so half the moves on a revealed map have nothing to click. Off by default — the game
   * itself never sets it. */
  freeWalk?: boolean
  explorerPos?: readonly [number, number]
  /** The explorer is mid-span and drawn nowhere until he lands. */
  explorerHidden?: boolean
  /** A zipline being ridden: drawn as one slide beside the explorer, who is hidden meanwhile. */
  ride?: Ride | null
  /** Where the rider hangs at each end of the ride and how big it is drawn; unset uses RIDE_POSES. A look, tuned in a story. */
  ridePoses?: RidePoses
  /** Draw the ride standing still at its first or last frame instead of sliding it: a story's way to tune the poses. */
  rideFrame?: "from" | "to"
  /** A narrow passage being squeezed through: drawn as two slides beside the explorer, who is hidden meanwhile. */
  squeeze?: Squeeze | null
  /** Current floor index. Keys the explorer dot so a floor switch remounts it (instant snap to the
   * new floor's entrance) instead of animating a walk from the previous floor's coordinates. */
  currentFloor?: number
  /** "row,col" keys of completed treasure cells with a reward still waiting to be picked up */
  pendingCells?: ReadonlySet<string>
  /** Keys the player already holds — used only to color a gate as locked/unlocked on the map. */
  ownedKeys?: ReadonlySet<string>
  /** Every mechanism's current position on this journey, keyed by its cell address — the same map
   * `openDoorsFor` reads, and for the same reason: the save holds the position, the floor holds what it
   * means. Read here only for a control's OWN room, to throw its arm to the position it actually
   * stands in rather than always drawing its `initial` one. */
  mechanismStates?: ReadonlyMap<string, string>
  /** The way in the explorer is standing at, drawn as a button beside him — see `useSiteNavigation`. */
  prompt?: { label: string; at: readonly [number, number]; onTake: () => void } | null
  /** Why the explorer stopped, drawn where the prompt is — see `useSiteNavigation`. */
  notice?: { label: string; at: readonly [number, number] } | null
  className?: string
}

/** How far the cresset at a stair's mouth stands from the middle of its cell, measured off the painted
 * tile rather than guessed: the flame's own pixels land 24 units to one side of centre. WHICH side is a
 * fact about the file — see `flameOnRight` where the flights are placed. */
const STAIR_FLAME_DX = CELL * 0.43

/** Where the standing torch's flame stands across its frame, measured off the painted tile: its pixels
 * land 25 units from the left edge, a hair left of centre. */
const TORCH_FLAME_X = CELL * 0.45
/** How far behind its floor line the torch's foot stands: the middle of its painted base, so the pool sits
 * round the foot rather than in front of it. */
const TORCH_FOOT_DEPTH = CELL * 0.1

/** Anything standing on the floor, with the line it stands on — a room's own furniture and a node's.
 *
 * One list so the PLAYER can be drawn in the middle of it. Two things stand on a map: the explorer and
 * whatever a room holds, and which occludes which is decided by the floor line, never by the sprite's
 * top — a tall statue at the back of a chamber belongs behind a low chest at its front.
 */
type StandingSprite = {
  key: string
  /** The y a sprite's own floor line sits at, in map space. Lower on the page is nearer the viewer. */
  baseY: number
  /** Where this sprite's own flame lands on the floor, if it carries one — see NodeSprite.light. */
  light?: NodeSprite["light"]
  /** This sprite's own footprint includes the cell the explorer is standing on: a room whose entry has
   * no free quarter to step its furniture into (`nodeArtOffset`'s `dy: 0`, a straight passage with a
   * south door — a lever's, a handle's) shares the explorer's exact floor line rather than merely
   * happening to. The general tie there ("the actor belongs in front of the furniture he shares a floor
   * line with") is for furniture the player passes NEAR; furniture he stands AT has to win instead, or
   * he stands on the lever and covers it. */
  atExplorer?: boolean
  node: ReactNode
}

/** One half of the sorted set. Depth is DOM order: the list is already sorted by floor line, so the
 * later a thing is written the nearer the viewer it stands. A sprite that must be cut to its room
 * carries its own clip (see `Sprite`'s `clipTo`) rather than being wrapped in a clipping group. */
const StandingLayer = ({ sprites }: { sprites: readonly StandingSprite[] }) => <>{sprites.map(s => s.node)}</>

/** For every cell, the cell you came FROM walking out of the floor's entrance — so a node can be drawn
 * on its own approach rather than on itself. Built once per floor and only when something asks, because
 * only the gates do.
 *
 * A GATE'S LEAF STANDS IN THE PASSAGE IT SHUTS, one cell in front of the gate's own square, which is
 * where a door is: between you and what it keeps you from. Every gate in the world is a CUT — nothing
 * behind one is reachable another way — and the explorer is halted on this very cell rather than walked
 * through it (`useSiteNavigation`), so the leaf and the player meet face to face.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure function over the grid, exported so tests can assert on cells
export const approachCells = (grid: FloorGrid): Map<string, readonly [number, number]> => {
  const from = new Map<string, readonly [number, number]>()
  const seen = new Set([`${grid.entrancePos[0]},${grid.entrancePos[1]}`])
  const queue: Array<readonly [number, number]> = [grid.entrancePos]
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i]
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty") continue
    for (const dir of cell.dirs) {
      const [dr, dc] = DIR_MOVES[dir]
      const next = [r + dr, c + dc] as const
      const key = `${next[0]},${next[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      from.set(key, [r, c])
      queue.push(next)
    }
  }
  return from
}

/** The lever's authored throw: ±36° off upright. Not ours to shrink — at 20° the two states' grips sit
 * 0.42 apart against a 0.68-wide dome and read as one lever wobbling; at 36° each grip clears the dome
 * and the pair reads as a backslash and a forward slash (`prim_lever`'s docstring, `scripts/renderProp.py`).
 */
const HANDLE_THROW_DEG = 36

/** Where an N-state control's arm sits: an index into its own ORDERED state list, spread evenly across
 * ±throwDeg. An index and not two hardcoded sides, because a wheel's control has more states than a
 * lever's two and the renderer must not be written for a binary. A single-state list has nothing to
 * throw between and stands upright. */
const angleForState = (index: number, count: number, throwDeg: number): number =>
  count <= 1 ? 0 : -throwDeg + (2 * throwDeg * index) / (count - 1)

/** `renderProp.py`'s shear (`z' = z + k*y`, so a unit of world DEPTH draws into the shared vertical axis
 * at `k` times the rate a unit of world HEIGHT does) scaled by the tile's own width/height ratio
 * (`add_camera`'s aspect framing — the tile is 112x168, not square). A plain CSS `rotate()` on the arm
 * tile treats its pixel grid as isotropic; the render that produced the tile was not, by this amount. */
const LEVER_SHEAR_K = 0.7
const LEVER_TILE_ASPECT = 112 / 168
const LEVER_CORRECTION_S = LEVER_SHEAR_K * LEVER_TILE_ASPECT // ≈ 0.4667

/** Undo the projection's vertical squash, rotate in the corrected space, and put the squash back —
 * `scaleY(1/s) rotate(θ) scaleY(s)`, composed about the shaft's own pivot (CSS applies these right to
 * left, so the squash goes on first and comes off last). A naive `rotate(θ)` alone puts the tip 10-13px
 * past the track's painted end at the full ±36° throw, measured against the real ±36° 3D geometry in
 * `Lever.stories.tsx`; this keeps it inside the rim instead — 65.8 of 112 at +36° and 46.2 at -36°,
 * against a track painted at 45-67, where the naive tip landed at 77.0 and 35.0. */
const leverArmTransform = (angleDeg: number): string =>
  `scaleY(${1 / LEVER_CORRECTION_S}) rotate(${angleDeg}deg) scaleY(${LEVER_CORRECTION_S})`

const NO_STATES: ReadonlyMap<string, string> = new Map()

/** Every node's own furniture on one floor, in map space — chests beside treasure rooms, flights at
 * stairheads. See `NodeSprite` for why this is a list and not a child of each node's own `<g>`.
 *
 * A SHOP wears the treasure marker and gets no chest: his goods are a market stall rather than a sealed
 * chest, and drawing one would say the wrong thing about a room you buy from. A stairhead at the floor's
 * own `entrancePos` is the way back UP (pyramid-interior-design.md: a stairhead descends), and absent
 * art simply yields nothing, leaving the vector marker to carry the node as it always did.
 */
// eslint-disable-next-line react-refresh/only-export-components -- pure function over the grid, exported so tests can assert on sprites
export const nodeSpritesFor = (
  grid: FloorGrid,
  claims: RoomClaims,
  floorTier: Difficulty,
  pendingCells?: ReadonlySet<string>,
  /** Every mechanism's current position, and which floor this is — together the address a lever's own
   * state is stored under (`cellAddress`, `mechanismDoors.ts`). Absent for callers with no journey yet
   * (a story, a hand-built test grid): every control then draws at its own `initial` position. */
  mechanismStates?: ReadonlyMap<string, string>,
  floorIndex = 0,
  /** Where the explorer stands once his walk has settled, for the plate he presses; unset while he walks. */
  standingAt?: readonly [number, number],
  /** What the explorer's weight moves while he stands on a plate: drawn so, never walked so. */
  weight?: ExplorerWeight
): NodeSprite[] => {
  // Which cells belong to each room: the room's own, plus everything it claimed.
  const footprints = new Map<string, string[]>()
  for (const [cellKey, ownerKey] of claims.claimedBy) {
    const own = footprints.get(ownerKey)
    if (own) own.push(cellKey)
    else footprints.set(ownerKey, [ownerKey, cellKey])
  }
  /**
   * The footprint a sprite is CLIPPED to: the room's own cells, plus any neighbour that is real floor.
   *
   * A chest is stepped away from its doorways (`nodeArtOffset`, 0.3 of a cell across and 0.2 down) and a
   * node sprite is a cell wide, so the offset always hangs past the room's own cells. Clipped to those
   * alone it lost a third of itself to the side of its own cell. Translating the clip with the art fixed
   * that and broke the other half: where the step pointed at VOID, the clip went with it and the chest
   * was drawn out over the dark beyond the wall.
   *
   * So the clip grows, but only into ground. A neighbour counts if the grid has something there — and a
   * CLAIMED cell counts too, because a chamber's own floor is `type: "empty"` in the grid and the claim
   * is a render-time fact, which is the trap `floorScatter` and `MapGrowth` both record. Where there is
   * paving beside it the chest overlaps the paving; where there is masonry it is still cut at the
   * masonry, which is what the clip was for.
   */
  const clipCells = (footprint: readonly string[]): string[] => {
    const cells = new Set(footprint)
    for (const key of footprint) {
      const [r, c] = key.split(",").map(Number)
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const nr = r + dr
        const nc = c + dc
        const neighbourKey = `${nr},${nc}`
        if (cells.has(neighbourKey)) continue
        const isFloor = cellAt(grid, nr, nc).type !== "empty" || claims.claimedBy.has(neighbourKey)
        if (isFloor) cells.add(neighbourKey)
      }
    }
    return [...cells]
  }
  const out: NodeSprite[] = []
  // A DROP IS PLACED BY THE CARVE'S SHAPE, NOT DRESSED: its obstacle is the ONE_WAY_RUN_CELLS cells the
  // carve reserved between a launch and a landing, and the art is drawn across all of them — every one is
  // in the footprint, so nothing else stands under it. It is a node sprite, never a `DecorationKind`, so
  // no dressing pool can name it. `tileUrl` and not `tileOrPlaceholder`: an obstacle with no painted art
  // keeps the plain corridor it always drew rather than a stand-in. The obstacle reveals as
  // one, so its last cell being fogged means all of it is.
  for (const run of oneWayRuns(grid)) {
    const [lr, lc] = run.cells[run.cells.length - 1]
    const end = grid.cells[lr][lc]
    if (end.type !== "corridor") continue
    const art = DROP_ART[run.dir]
    const { x, y, w, h } = dropFrame(run.cells, run.dir)
    const dropUrl = art && tileUrl(end.difficulty ?? floorTier, art.name)
    if (!art || !dropUrl || end.state === "fogged") continue
    out.push({
      footprint: clipCells(run.cells.map(([r, c]) => `${r},${c}`)),
      key: `drop:${lr},${lc}`,
      url: dropUrl,
      x,
      y,
      w,
      h,
      mirrored: art.mirrored,
    })
  }
  let approach: Map<string, readonly [number, number]> | null = null
  /** The leaf of one gate, hung in the passage it shuts. A shut gate is a room; an OPEN one a lever or
   * switch holds open is a corridor that remembers it (`CorridorCell.openGate`) — both draw through here,
   * so the open leaf stands exactly where the shut one did. */
  const gateLeaf = (
    r: number,
    c: number,
    tier: Difficulty,
    dirs: ReadonlySet<Direction>,
    { open, wall, mark }: { open: boolean; wall: boolean; mark: Mark | undefined }
  ): void => {
    // `gate` is shut and `gate-open` is the same leaf swung back or sunk into the floor; a rank with
    // neither draws the marker alone, exactly as a stairhead did before its flights were painted.
    //
    // THE LEAF STANDS ONE CELL IN FRONT, in the passage it shuts (`approachCells`) — the MARKER keeps
    // the gate's own square, because its colour is the only thing that says which key, and moving it
    // would take that off the node it belongs to. Which is also why the leaf is clipped to the cell
    // it stands in and not to the gate's room: a footprint clip is what keeps furniture inside its
    // own walls, and the gate's would erase a leaf drawn outside them.
    //
    approach ??= approachCells(grid)
    const stands = approach.get(`${r},${c}`)
    if (!stands) return
    const [ar, ac] = stands

    // THE BARS FACE THE POCKET, NOT AWAY FROM THE PLAYER, and on two thirds of the gates in the
    // world those are different directions. Only `ns` and `ew` gates run straight through; `es`,
    // `sw`, `nw` and `en` are CORNERS, and on a corner the way you came in and the way that is
    // sealed are at right angles — so "the side opposite the approach" hung the gate on a wall the
    // pocket is not even behind, one turn away from the seam it belongs in.
    //
    // The sealed side is the one whose neighbour is reached THROUGH this gate, which `approachCells`
    // already knows: it is the neighbour whose own approach is the gate itself. That also settles a
    // cell with three ways out, where "not the way I came" would have been a choice of two.
    const back: Direction = ar < r ? "n" : ar > r ? "s" : ac < c ? "w" : "e"
    const sealed = [...dirs].find(dir => {
      if (dir === back) return false
      const [mr, mc] = DIR_MOVES[dir]
      const beyond = approach?.get(`${r + mr},${c + mc}`)
      return beyond?.[0] === r && beyond?.[1] === c
    })
    const [dr, dc] = sealed ? DIR_MOVES[sealed] : [r - ar, c - ac]

    // A GATE IS AIMED BY WHICH ONE IS DRAWN, the same as a flight. Shutting a way walked ACROSS, the
    // grille's own plane is the y-z one and this projection draws that as a line, so `-side` is a
    // second drawing: narrow and tall where the face-on one is broad, because that is the shape this
    // projection actually makes of it. Turning the tile instead would be a skew — a reflection is a
    // real oblique view and a rotation is not (`NodeSprite`).
    const name = `${open ? "gate-open" : "gate"}${dc !== 0 ? "-side" : ""}`
    const url =
      tileOrPlaceholder(tier, name) ??
      tileOrPlaceholder(tier, open ? "gate-open" : "gate") ??
      (open ? tileOrPlaceholder(tier, "gate") : undefined)
    if (!url) return

    // THE BARS STAND ON THE SILL. Wherever one rank's stone meets another's across a way the player
    // walks, the map lays a threshold in the tier being entered (`tileRegions`), and a ward gate is
    // exactly such a seam because the pocket it shuts is authored at another tier. A shut gate's own
    // square wears the FLOOR's stone rather than the pocket's (`cellFloorAt`, which is what stops the
    // next tier being read off the paving early), so the seam falls on the sealed side of it: the
    // gate's square is the ground you stand on to work the gate, and the bars are its far wall.
    //
    // Which is also why nothing halts the player short of it. He walks in and stops at the bars, the
    // way you do at a locked gate, and the cell he is standing on is the gate's own.
    // THE SEAM IN THE MAP'S OWN ARITHMETIC. `cellLeft`/`cellTop` put the gap BEFORE each cell, so the
    // one AFTER cell c starts at `cellLeft(c) + CELL` and is `SIDE_W` wide, and the band after row r
    // starts at `cellTop(r) + CELL` and is `WALL_H` tall. Both far cases were written as if the gap
    // came before: the gate stood a whole `SIDE_W` west of the seam it belonged in, and rested on the
    // TOP edge of the band below it rather than the bottom, hanging 28 units clear of its own sill.
    const seamCx = dc > 0 ? cellLeft(c) + CELL + SIDE_W / 2 : dc < 0 ? cellLeft(c) - SIDE_W / 2 : cellLeft(c) + CELL / 2
    // IN the band, not under it and not on top of it. A horizontal seam is `WALL_H` of wall seen face
    // on: feet on its lower edge hang the whole grille below the opening, in the room rather than in
    // the doorway, and feet on its upper edge lift it clear of the floor it is supposed to bar. Half
    // a band down from the top puts it in the middle of the masonry, which is where a gate hangs.
    // A seam between COLUMNS has no such band — it is a side wall seen edge-on — so there the floor
    // line is the floor line.
    const seamBase = dr > 0 ? cellTop(r) + CELL + WALL_H / 2 : dr < 0 ? cellTop(r) - WALL_H / 2 : cellTop(r) + CELL
    const base = seamBase
    const left = seamCx - CELL / 2
    out.push({
      // The gate's cell AND the one beyond it, because the clip is what keeps furniture inside its
      // own walls and this deliberately spans one: clipped to either alone, half the gate is cut.
      footprint: [`${r},${c}`, `${r + dr},${c + dc}`],
      // The same two cells fade it: they are the only ones ever behind a gate, exactly as a doorway
      // fades for the two its arch spans.
      fadeAt: [`${r},${c}`, `${r + dr},${c + dc}`],
      // A WAY A SWITCH SHUT IS NOT A GATE HUNG IN A DOORWAY BUT A WALL, and a wall is painted with
      // the rest of the stone rather than with the leaves that go on last: the arch over the opening
      // covers it, the way it covers everything else standing on the floor.
      key: `${wall ? "wall" : "gate"}:${r},${c}`,
      url,
      x: left,
      y: base - PROP_H,
      mirrored: false,
      // ON THE LEAF, NOT ON THE MARKER: a way a lever shut hides its marker entirely, so the pair
      // its lever wears has to be worn by the stone the player is actually looking at.
      ...(mark ? { mark } : {}),
    })
  }
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "corridor" && cell.openGate && cell.state !== "fogged") {
        // A way the explorer's weight shuts is drawn shut while he stands there; the walk still reads the corridor it is.
        gateLeaf(r, c, cell.difficulty ?? floorTier, cell.dirs, {
          open: !weight?.shut.has(cell.openGate.requiredKeyId ?? ""),
          wall: false,
          mark: cell.openGate.mark,
        })
        continue
      }
      if (cell.type !== "room" || cell.state === "fogged") continue
      const kind = shapeKindFor(grid, r, c, cell)
      const tier = cell.difficulty ?? floorTier
      const { cx, cy } = cellCenter(r, c)
      const footprint = clipCells(footprints.get(`${r},${c}`) ?? [`${r},${c}`])
      if (kind === "treasure" && !cell.tags?.includes("shop")) {
        const url = tileOrPlaceholder(tier, "chestProp")
        if (!url) continue
        const { dx, dy } = nodeArtOffset(cell.dirs)
        out.push({
          footprint,
          key: `chest:${r},${c}`,
          url,
          x: cx + dx - CELL / 2,
          y: cy + dy + CELL / 2 - PROP_H,
          mirrored: false,
          // A reward left behind because the pack was full is still there to come back for: that chest
          // stays full, and wears the `!` rather than the ✓. A chest whose family keeps its room open
          // wears neither, and is not dimmed: the ✓ and the fade are the pair that say emptied.
          ...(cell.state === "completed" && !staysOpen(cell)
            ? { badge: pendingCells?.has(`${r},${c}`) ? ("pending" as const) : ("taken" as const) }
            : {}),
        })
      } else if (kind === "exit") {
        // THE WAY OUT IS A MARKER, NOT ARCHITECTURE. A doorway has to be aimed — face on it needs the
        // wall it is cut in, and walked across it becomes a narrow lit slot that reads as a column, which
        // this set already draws as `pillar`. A shaft of light standing free on the floor is the same
        // picture from every approach, so it needs no facing, no side drawing and no seam to stand in: it
        // is placed on its own cell like a chest, and the renderer lays a pool at its foot the way it does
        // for a stair's cresset.
        const url = tileOrPlaceholder(tier, "exit")
        if (!url) continue
        const { cx: ex, cy: ey } = cellCenter(r, c)
        out.push({
          footprint,
          key: `exit:${r},${c}`,
          url,
          x: ex - CELL / 2,
          y: ey + CELL / 2 - PROP_H,
          mirrored: false,
          light: { x: ex, y: ey + CELL * 0.12, r: LAMP_POOL_RADIUS },
        })
      } else if (kind === "gate" && cell.passage) {
        // A NARROW PASSAGE IS A WALL STANDING IN ITS OWN CELL, a crack in it: drawn in the cell-wide prop frame like a
        // plate, never hung on a seam like a gate's leaf, and the same at every rank. Nobody stands in it; it fades
        // while the explorer waits on the cell behind it. Unpainted, it is drawn as the shut gate it is to the walk.
        const url = passageArtUrl(cell)
        if (url)
          out.push({
            footprint,
            key: `passage:${r},${c}`,
            url,
            x: cx - CELL / 2,
            y: cy + CELL / 2 - PROP_H,
            mirrored: false,
            fadeAt: [`${r},${c}`, `${r - 1},${c}`],
            ...(cell.mark ? { mark: cell.mark } : {}),
          })
        else gateLeaf(r, c, tier, cell.dirs, { open: false, wall: true, mark: cell.mark })
      } else if (kind === "gate" && cell.regionBarrier) {
        // A REGION BARRIER IS THE COVER ITSELF, NOT A DOOR HUNG IN THE PASSAGE: the water or sand is drawn
        // under the floor's light (RegionBarrierCovers), and this sprite is only the seat for the owner's
        // mark, the one thing tying the blockage to its mechanism, so it stands above the cover.
        out.push({
          footprint,
          key: `blockage:${r},${c}`,
          x: cx - CELL / 2,
          y: cy + CELL / 2 - PROP_H,
          mirrored: false,
          ...(cell.mark ? { mark: cell.mark } : {}),
        })
      } else if (kind === "gate") {
        gateLeaf(r, c, tier, cell.dirs, {
          open: cell.state === "completed" || (weight?.open.has(cell.requiredKeyId ?? "") ?? false),
          wall: isSealedWayOut(cell),
          mark: cell.mark,
        })
      } else if (drawingOf(cell)?.art === "lever") {
        // BLOCKED UNTIL ALL THREE TILES EXIST, AND NEVER PLACEHOLDER: `tileUrl`, not `tileOrPlaceholder`
        // — a stand-in dome with no arm to swing would draw a lie, and the superseded single-piece
        // `leverLeft`/`leverRight` tiles are not reached for either. A rank with only some of the three
        // painted draws none of them, leaving the room's own marker to carry it, same as an unpainted
        // stairhead or exit above.
        const back = tileUrl(tier, "leverBaseBack")
        const arm = tileUrl(tier, "leverArm")
        const front = tileUrl(tier, "leverBaseFront")
        if (!back || !arm || !front) continue
        // Stepped off its own doorways exactly as a chest is (`nodeArtOffset`): a lever is a cell's
        // worth of furniture like any other, not a doorway fitting.
        const { dx, dy } = nodeArtOffset(cell.dirs)
        // THE CONTROL'S CURRENT POSITION, NOT ALWAYS ITS INITIAL ONE: the same address `openDoorsFor`
        // reads a saved position off, falling back to the mechanism's own `initial` for the same reason
        // it does — a save with no entry yet is standing wherever the floor was authored to start it.
        const mechanism = cell.mechanism
        let angleDeg = 0
        if (mechanism) {
          const state = storedAtCell(grid, floorIndex, r, c, mechanismStates) ?? mechanism.initial
          const index = mechanism.states.indexOf(state)
          if (index >= 0) angleDeg = angleForState(index, mechanism.states.length, HANDLE_THROW_DEG)
        }
        out.push({
          footprint,
          key: `handle:${r},${c}`,
          ...(isSpentAt(grid, floorIndex, r, c, cell, mechanismStates) ? { spent: true } : {}),
          url: back,
          x: cx + dx - CELL / 2,
          y: cy + dy + CELL / 2 - PROP_H,
          mirrored: false,
          armStack: { armUrl: arm, frontUrl: front, angleDeg },
        })
      } else if (drawingOf(cell)?.art === "standingTorch") {
        // ONE SHARED PAINTING, lit or not by the control's own position. A lit torch is NOT eased back the way
        // an emptied chest is: the flame is what says it is used, and a see-through post over its own pool of
        // light reads as a ghost. Its marker still wears the ✓. The lit tile is imported with no seat shadow,
        // because the pool laid at its foot lights the floor that shadow would have fallen on.
        const spent = isSpentAt(grid, floorIndex, r, c, cell, mechanismStates)
        const url = sharedTileUrl(spent ? "torchLit" : "torchUnlit")
        if (!url) continue
        const { dx, dy } = nodeArtOffset(cell.dirs)
        const x = cx + dx - CELL / 2
        const floorLine = cy + dy + CELL / 2
        out.push({
          footprint,
          key: `standingTorch:${r},${c}`,
          url,
          x,
          y: floorLine - PROP_H,
          mirrored: false,
          ...(spent ? { light: { x: x + TORCH_FLAME_X, y: floorLine - TORCH_FOOT_DEPTH, r: LAMP_POOL_RADIUS } } : {}),
        })
      } else if (cell.plate) {
        // A PLATE IS FLAT ON THE FLOOR, drawn in the cell-wide prop frame like an exit, in the look its stones and
        // the explorer's weight give it now. The shared painting, never a rank's: a plate is the same at every rank.
        const standing = standingAt !== undefined && standingAt[0] === r && standingAt[1] === c
        const look = plateLookAt(grid, floorIndex, r, c, mechanismStates ?? NO_STATES, standing)
        const url = look && sharedTileUrl(PLATE_TILE[look])
        if (!url) continue
        out.push({
          footprint,
          key: `plate:${r},${c}`,
          url,
          x: cx - CELL / 2,
          y: cy + CELL / 2 - PROP_H,
          mirrored: false,
        })
      } else if (kind === "stairhead") {
        const goesUp = r === grid.entrancePos[0] && c === grid.entrancePos[1]
        // A FLIGHT IS AIMED BY WHICH ONE IS DRAWN, not by turning one. Descending, it can only come
        // TOWARD the viewer — receding, the rise subtracts what the going adds and the treads collapse
        // into one band — so a stairhead entered from the side takes the flight that walks across X
        // instead, mirrored when the corridor is on the wrong hand. Absent art falls back to the
        // toward-viewer flight, so a rank with one file still draws all four facings.
        const sideways = cell.dirs.has("e") || cell.dirs.has("w")
        const side = sideways ? tileOrPlaceholder(tier, goesUp ? "stair-up-side" : "stair-down-side") : undefined
        // The descending flight walked the OTHER way up the page: entered from the south its treads are
        // at the near lip of the shaft rather than the far one, which is the picture flipped in Y. That
        // flip is the one thing the renderer must not do, because it would carry the cresset down with
        // it and stand the flame on the floor — so the south approach is a file of its own, painted with
        // the torch left where it stands. Absent, the north flight stands in for both.
        const downhill =
          cell.dirs.has("s") && !cell.dirs.has("n") ? tileOrPlaceholder(tier, "stair-down-south") : undefined
        const url =
          side ?? (goesUp ? undefined : downhill) ?? tileOrPlaceholder(tier, goesUp ? "stair-up" : "stair-down")
        if (!url) continue
        // The two side flights are painted opposite-handed, because each is drawn from where the player
        // stands: the descending one is entered at its top tread on the EAST, the climbing one at its
        // bottom tread on the WEST. So they mirror on opposite approaches, and a cell open both ways is
        // approached from the east like any other.
        const fromWest = cell.dirs.has("w") && !cell.dirs.has("e")
        const mirrored = side !== undefined && goesUp ? !fromWest : fromWest
        // WHICH SIDE THE CRESSET IS PAINTED ON IS A FACT ABOUT THE FILE, not about the approach. The
        // toward-viewer flights — `stair-down` and `stair-down-south` — carry it on the LEFT of the cell;
        // the side flight carries it on the RIGHT. Mirroring then swaps whichever it is. Reading the
        // mirror flag alone put the pool on the wrong hand of every side flight: a stair entered from the
        // east drew its torch on the right and lit the floor on the left.
        const flameOnRight = side !== undefined
        const flameDx = (flameOnRight === mirrored ? -1 : 1) * STAIR_FLAME_DX
        out.push({
          // ONLY THE DESCENDING FLIGHTS CARRY A CRESSET. A shaft is a hole in the floor and needs a
          // flame at its lip to read as one; the climbing flights are lit by the room they stand in and
          // none was painted on them, so lighting one laid a pool of torchlight on the floor beside a
          // stair with nothing burning on it. Measured off the painted tile: the flame sits 24 units to
          // one side of the cell's centre, a little above it.
          ...(goesUp
            ? {}
            : {
                light: {
                  x: cx + flameDx,
                  y: cy - CELL * 0.1,
                  r: LAMP_POOL_RADIUS,
                },
              }),
          footprint,
          key: `stair:${r},${c}`,
          url,
          x: cx - CELL / 2,
          y: cy + CELL / 2 - PROP_H,
          mirrored,
        })
      }
    }
  }
  return out
}

// The floor's own geometry — which void a room claims, what stone a cell is cut from, and the tile
// regions that fall out of both — lives in `roomClaims.ts`. It is pure grid reading, shared by the
// renderer and by the map's click rules, and testable without mounting anything.

// The stone — floor, wall mass, faces, sills and their washes — is drawn by `tileLayers.tsx`.

// ─── Decorations ────────────────────────────────────────────────────────────────
// A prop is drawn in the room's first genuine claim (void or diagonal — never a flank corridor,
// see buildRoomClaims above): the tier's sprite when it has one, and the placeholder glyph when it
// does not, so art can land one piece at a time.

/** Props that carry a live flame, and so light the floor they stand on.
 *
 * Only `lamp` for now, and the reason is per-RANK rather than per-kind: the brief gives the merchant a
 * brazier of cold ash and the nobleman one "lit and smoking", so a brazier's light depends on whose tomb
 * it is. Widen this to a (rank, kind) lookup when a rank that lights its brazier has the art for it —
 * lighting the merchant's would contradict the sprite, which was painted with no flame and no glow. */
const LIT_DECORATIONS = new Set<DecorationKind>(["lamp"])

/** A lamp's pool is smaller and steadier than the explorer's — it sits on a stool rather than being
 * carried. It still has a room's worth of dark to hold back, though (FloorShade), so it reaches most of
 * the way across a chamber: a flame that lit only its own tile left the place it stands in unlit. */
const LAMP_POOL_RADIUS = CELL * 0.9

/** One room's prop. `seed` decides WHICH drawing of the kind, where a kind has more than one.
 *
 * The choice is positional and deterministic — the cell's own coordinates inside its site — which keeps it
 * a seeded layer over placement rather than part of it: the same floor draws the same thing every time it
 * is opened, and dropping a second drawing in reshuffles no furniture, because `pickDressing` never sees
 * it (see `tileVariants`). */
const Decoration = ({
  kind,
  tier,
  seed,
  patron,
}: {
  kind: DecorationKind
  tier: Difficulty
  seed: string
  patron?: Patron
}) => {
  // A PATRON BEATS A VARIANT. Both choose a drawing, and where a site names a god that choice is
  // authored rather than positional — a dedicated tomb whose statues varied by cell would be saying two
  // things at once. Falls straight through to the variant pick wherever no patron art exists, which is
  // everywhere today.
  const dedicated = patron ? patronTileUrl(tier, kind, patron) : undefined
  const own = dedicated && dedicated !== tileOrPlaceholder(tier, kind) ? dedicated : undefined
  const variants = tileVariants(tier, kind)
  const url =
    own ??
    (variants.length > 1 ? variants[hashString(`${seed}:${kind}`) % variants.length] : tileOrPlaceholder(tier, kind))
  return (
    <>
      {/* Under the sprite, so the light is on the floor and the lamp is standing in it. */}
      {LIT_DECORATIONS.has(kind) && <LightPool r={LAMP_POOL_RADIUS} cy={CELL * 0.3} />}
      {url ? (
        <Sprite
          url={url}
          x={-CELL / 2}
          y={CELL / 2 - PROP_H}
          w={CELL}
          h={PROP_H}
          stretch={false}
          filter={STANDING_RELIEF[tier]}
        />
      ) : (
        <DecorationGlyph kind={kind} />
      )}
    </>
  )
}

/** GROUND: blown sand, or a mat of grass, drawn over the floor and clipped to it.
 *
 * The scatter that is not cell-sized. Neither has a silhouette of its own — one is the shape of whatever
 * stopped it, the other the shape of where the water sat — so both are drawn several cells across and cut
 * to `walkable-floor`, and the wall does the drawing. See `driftsFor` for why sand is one shared file
 * rather than five; the grass is shared for the same reason (`grassMatsFor`).
 *
 * No per-cell fog check, because a drift is not per-cell: it is washed by the DARKEST state it crosses,
 * so a drift reaching into an unlit passage cannot light it. That is the same sum `FloorScatter` does
 * with `brightness`, taken over a region instead of over a cell. */
const GroundCover = ({
  grid,
  drifts,
  url,
  kind,
  floorRects,
}: {
  grid: FloorGrid
  drifts: Drift[]
  /** The tile these are drawn from — one shared file, whichever ground this is. */
  url: string | undefined
  /** Which ground this is, for the tests that have to tell weather from condition. */
  kind: "sand" | "grass"
  /** The walkable floor, as rectangles: what the wall does the drawing with. */
  floorRects: readonly Rect[]
}) => {
  if (!url || floorRects.length === 0) return null
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {drifts.map(({ row, col, w, h }, i) => {
        const cell = cellAt(grid, row, col)
        if (cell.type === "empty") return null
        const wash = stateWash[cell.state]
        const { cx, cy } = cellCenter(row, col)
        const dw = CELL * w
        const dh = CELL * h
        // EACH DRIFT IS CUT TO THE FLOOR IT LIES ON, and only to the part of it the drift can reach.
        // Cutting them all to the whole walkable floor at once made one layer the size of the map, and a
        // clipped element is rasterised at its own size — which is what a phone cannot afford.
        const near = floorRects.filter(
          ([fx, fy, fw, fh]) => fx < cx + dw / 2 && fx + fw > cx - dw / 2 && fy < cy + dh / 2 && fy + fh > cy - dh / 2
        )
        if (near.length === 0) return null
        return (
          <Sprite
            key={i}
            url={url}
            data-ground={kind}
            x={cx - dw / 2}
            y={cy - dh / 2}
            w={dw}
            h={dh}
            clipTo={near}
            filter={wash ? `brightness(${1 - wash.opacity})` : undefined}
          />
        )
      })}
    </div>
  )
}

/** What is lying about, drawn over the floor and under everything that stands on it.
 *
 * Bottom-anchored in the same box a prop uses, so it sits on the cell's floor line — flat scatter only
 * fills the lower part of that box, so nothing reaches into the wall band a prop's headroom is for.
 *
 * A fogged cell draws nothing: sand in an unlit passage would be the one thing visible in it. */
const FloorScatter = ({
  grid,
  scatter,
  tier,
}: {
  grid: FloorGrid
  scatter: ReadonlyMap<string, ScatterKind>
  tier: Difficulty
}) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {[...scatter].map(([cellKey, kind]) => {
      const [r, c] = cellKey.split(",").map(Number)
      const cell = cellAt(grid, r, c)
      if (cell.type === "empty" || cell.state === "fogged") return null
      const url = tileOrPlaceholder(tier, kind)
      if (!url) return null
      const { cx, cy } = cellCenter(r, c)
      // The same wash the floor under it takes, as BRIGHTNESS rather than as an overlay. `stateWash` is
      // a black fill at an opacity and TileLayers applies it to the floor PATHS, so everything drawn
      // afterwards is unwashed — a drift of sand on a cell the player has only seen came out the
      // brightest thing on that cell. A rect over the sprite cannot stand in for it, because the sprite
      // is mostly transparent; brightness(1 - opacity) is the same sum on the pixels that exist.
      const wash = stateWash[cell.state]
      return (
        <Sprite
          key={cellKey}
          url={url}
          x={cx - CELL / 2}
          y={cy + CELL / 2 - PROP_H}
          w={CELL}
          h={PROP_H}
          stretch={false}
          filter={wash ? `brightness(${1 - wash.opacity})` : undefined}
        />
      )
    })}
  </div>
)

const DECORATION_COLOR = "#5a4a30"

/** The placeholder for a prop with no art yet: a line drawing, so it is still a drawing and still vector.
 *
 * An inline `<svg>` of its own inside the HTML layer rather than shapes in the map's one big one — see
 * docs/instructions/map-rendering.md on the markers. It is static, so it costs a paint once and never
 * again; what the map could not afford was ANIMATION inside SVG. Centred on the cell like the sprite it
 * stands in for, with `overflow: visible` so a glyph is never clipped by its own little box. */
const DecorationGlyph = ({ kind }: { kind: DecorationKind }) => (
  <svg
    aria-hidden="true"
    viewBox="-12 -12 24 24"
    style={{ position: "absolute", left: -12, top: -12, width: 24, height: 24, overflow: "visible" }}
  >
    <GlyphShape kind={kind} />
  </svg>
)

const GlyphShape = ({ kind }: { kind: DecorationKind }) => {
  switch (kind) {
    case "sarcophagus":
      return (
        <rect x={-6} y={-10} width={12} height={20} rx={4} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
      )
    case "statue":
      return (
        <>
          <circle cy={-8} r={4} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
          <rect x={-4} y={-4} width={8} height={14} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
        </>
      )
    case "basin":
      return (
        <>
          <circle r={9} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
          <circle r={3} fill={DECORATION_COLOR} />
        </>
      )
    case "pit":
      return <ellipse rx={9} ry={7} fill="#0a0604" stroke={DECORATION_COLOR} strokeWidth={1.5} />
    case "rubblePile":
      return (
        <>
          <circle cx={-4} cy={2} r={3} fill={DECORATION_COLOR} opacity={0.7} />
          <circle cx={3} cy={-2} r={4} fill={DECORATION_COLOR} opacity={0.7} />
          <circle cx={2} cy={5} r={2.5} fill={DECORATION_COLOR} opacity={0.7} />
        </>
      )
    case "pillar":
      return <rect x={-4} y={-10} width={8} height={20} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
    case "mat":
      return <rect x={-9} y={-5} width={18} height={10} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
    default:
      // Every kind has art per tier; this is only ever seen for one that does not yet, and says
      // "something stands here" without pretending to say what.
      return (
        <rect x={-6} y={-6} width={12} height={12} rx={1} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
      )
  }
}

// ─── Wall items ────────────────────────────────────────────────────────────────
// A wall item hangs ON a wall, so unlike a prop it needs a wall to hang on: it is drawn into the face
// band above a cell of the room's footprint that HAS a face — the room's own cell first, then the cells
// it claims, in claim order. A room with no face anywhere in its footprint carries no wall item, which
// is also what keeps one off a fogged room: fog reads as unlit passage, and an unlit gap has no band.

type WallItem = {
  row: number
  col: number
  kind: WallDecorationKind
  tier: Difficulty
  /** the band's own light, so an item is not brighter than the wall it hangs on */
  state: CellState
}

/** Where each room's authored wall item lands. Exported for tests, same as the claim rules: cells
 * beat sniffing rendered SVG. */
// eslint-disable-next-line react-refresh/only-export-components -- pure function over the grid, exported so tests can assert on cells
export const wallItemsFor = (grid: FloorGrid, claims: RoomClaims, ownedKeys?: ReadonlySet<string>): WallItem[] => {
  const floorAt: FloorAt = (r, c) => cellFloorAt(grid, claims, ownedKeys, r, c)
  const openBetween = (r: number, c: number, dir: "s" | "e") => isPassable(grid, claims, r, c, dir)
  const claimedByOwner = new Map<string, string[]>()
  for (const [cellKey, ownerKey] of claims.claimedBy) {
    const list = claimedByOwner.get(ownerKey)
    if (list) list.push(cellKey)
    else claimedByOwner.set(ownerKey, [cellKey])
  }
  const items: WallItem[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.wallDecoration) continue
      const ownerKey = `${r},${c}`
      for (const key of [ownerKey, ...(claimedByOwner.get(ownerKey) ?? [])]) {
        const [br, bc] = key.split(",").map(Number)
        if (!hasWallFace(floorAt, openBetween, br, bc)) continue
        const at = floorAt(br, bc)
        if (typeof at === "string") continue
        items.push({ row: br, col: bc, kind: cell.wallDecoration, tier: at.tier, state: at.state })
        break
      }
    }
  }
  return items
}

const WallItems = ({ items, patron }: { items: readonly WallItem[]; patron?: Patron }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {items.map(({ row, col, kind, tier, state }) => {
      const url = patronTileUrl(tier, kind, patron)
      const x = cellLeft(col)
      const y = cellTop(row) - WALL_H
      const wash = stateWash[state]
      return (
        <Fragment key={`${row},${col}`}>
          {url ? (
            // The band's shape, not a square: a wall item is painted on the face.
            <Sprite url={url} x={x} y={y} w={CELL} h={WALL_H} data-wall-item="" />
          ) : (
            <div
              style={{
                position: "absolute",
                left: x + CELL / 2 - 6,
                top: y + WALL_H / 2 - 5,
                width: 12,
                height: 10,
                border: `1.5px solid ${DECORATION_COLOR}`,
                boxSizing: "border-box",
              }}
            />
          )}
          {wash && (
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: CELL,
                height: WALL_H,
                background: wash.fill,
                opacity: wash.opacity,
              }}
            />
          )}
        </Fragment>
      )
    })}
  </div>
)

// ─── Archways ──────────────────────────────────────────────────────────────────
// A doorway is where a passage meets a chamber, and in this idiom that is a gap the player walks
// through with a band above it. An arch is drawn INTO that band, over the floor of the way through: the
// lintel and jambs a chamber's entrance really had.
//
// Unlike everything else on the map an arch is painted LAST, over the explorer as well, because that is
// what makes it a thing in the world rather than a decal: the player walks under it and it passes in
// front of them. Which is also why it fades while they stand in it — an arch that hid the player would
// be a wall, and a doorway is not.

type Doorway = { row: number; col: number; tier: Difficulty }

/** Every doorway on the floor: the way into a CHAMBER, held in a wall run that gives its jambs corners to
 * stand on. Both sides have to be drawn floor, so an unexplored way through carries no arch — an arch is a
 * thing you can see, and the fog is what you cannot. Exported for tests. */
// eslint-disable-next-line react-refresh/only-export-components -- pure function over the grid, exported so tests can assert on cells
export const doorwaysFor = (grid: FloorGrid, claims: RoomClaims, ownedKeys?: ReadonlySet<string>): Doorway[] => {
  // A chamber is a room with a FOOTPRINT: it claims the cells around it, so it is a space you enter
  // rather than a station on a corridor. Every claimed cell and every claim owner counts as part of one.
  //
  // An encounter node on the path is a single cell with no footprint, and arching it put a gateway on
  // either side of every puzzle in the world — a corridor with doors across it every second step. A
  // doorway is somewhere a place BEGINS, which is what a footprint marks.
  const chamberCells = new Set<string>([...claims.claimedBy.keys(), ...claims.claimedBy.values()])
  const isChamber = (r: number, c: number) => chamberCells.has(`${r},${c}`)

  const floorOf = (r: number, c: number) => {
    const at = cellFloorAt(grid, claims, ownedKeys, r, c)
    return typeof at === "string" ? null : at
  }
  // Is the band above this cell a way through rather than wall?
  const openGap = (r: number, c: number) =>
    !!floorOf(r, c) && !!floorOf(r - 1, c) && isPassable(grid, claims, r - 1, c, "s")

  const doorways: Doorway[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const here = floorOf(r, c)
      const north = floorOf(r - 1, c)
      if (!here || !north || !openGap(r, c)) continue
      // Exactly one side is the chamber: the other is what you come in FROM. Two footprint cells are the
      // middle of one room, and neither being a chamber is a corridor with no door in it.
      const chamberSide = isChamber(r, c) ? here : isChamber(r - 1, c) ? north : null
      if (!chamberSide || (isChamber(r, c) && isChamber(r - 1, c))) continue
      // **A doorway is a hole in a wall RUN.** The arch hangs its jambs on the corners either side of the
      // opening (see ARCH_W), so those corners have to be masonry: if the band beside this one is itself a
      // way through, the opening is not one door but an open side, and an arch there stands on nothing.
      if (openGap(r, c - 1) || openGap(r, c + 1)) continue
      // **The stone of the band it interrupts**, which is the SOUTH cell's — the same rule tileRegions
      // colours that band by (tierAt), so an arch is cut from the wall it stands in rather than imported
      // into it. At a ward gate, where the rank changes across the gap, this is also the tier being
      // ENTERED, which is what the sill it replaces was keyed to: you pass through a sandstone gateway
      // into the sandstone ward. Taking the chamber's tier instead put a grey starter arch in a junior
      // wall, a doorway visibly imported from the wrong tomb.
      doorways.push({ row: r, col: c, tier: here.tier })
    }
  }
  return doorways
}

const Archways = ({
  doorways,
  explorerPos,
}: {
  doorways: readonly Doorway[]
  explorerPos?: readonly [number, number]
}) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {doorways.map(({ row, col, tier }) => {
      const url = tileOrPlaceholder(tier, "arch")
      if (!url) return null
      // Faded while the player is IN the doorway — standing on either of the two cells it spans. Only
      // those two are ever behind it, so nothing else on the map dims.
      const under = !!explorerPos && explorerPos[1] === col && (explorerPos[0] === row || explorerPos[0] === row - 1)
      return (
        <Sprite
          key={`${row},${col}`}
          url={url}
          data-arch=""
          // Wider than the cell by a corner on each side: the jambs stand IN those corners — the wall's
          // own thickness — rather than inside the opening, so the way through stays a full cell wide and
          // the arch reads as built into the wall run instead of set into the hole.
          x={cellLeft(col) - SIDE_W}
          // The band, plus the crown standing proud of the wall above it and the jambs reaching down onto
          // the floor of the way through below it.
          y={cellTop(row) - WALL_H - ARCH_RISE}
          w={ARCH_W}
          h={ARCH_H}
          opacity={under ? OCCLUDER_FADE : 1}
        />
      )
    })}
  </div>
)

/**
 * The shadow an archway's jambs throw on the floor they stand on.
 *
 * Drawn with the FLOOR, not with the arch. An arch is painted last, over the explorer, because the player
 * walks under it — but they walk OVER its shadow, and a shadow that darkened their feet as they passed
 * through the doorway would read as the gateway lying on top of them.
 *
 * It cannot be baked into the sprite either: the shadow falls below the jamb feet, outside the 84x49 slot.
 *
 * Same depth and colour as a wall face's, because it is the same light: what makes a wall sit on the floor
 * rather than float above it, applied to the one other thing standing on it.
 */
const ArchShadows = ({ doorways }: { doorways: readonly Doorway[] }) => {
  // ONE LAYER PER DOORWAY, not one for every doorway on the floor: a clipped element is rasterised at
  // its own size, and the shadows of all the doorways together span the map (which is what a phone's
  // renderer died of). A doorway's own two feet are a few dozen pixels.
  return (
    <>
      {doorways.map(({ row, col }) => {
        const left = cellLeft(col) - SIDE_W
        const top = cellTop(row) + ARCH_DROP
        const feet: Rect[] = [left, left + ARCH_W - SIDE_W].map(x => [x, top, SIDE_W, FACE_SHADOW] as Rect)
        return (
          <ClipLayer
            key={`${row},${col}`}
            data-arch-shadow=""
            rects={feet}
            fill={tierPalette.starter.outline}
            opacity={0.45}
          />
        )
      })}
    </>
  )
}

// The dark and the light in it — the tier's night, the lit place, and a prop's relief — live in
// `torchlight.tsx`.

// ─── Click-target markers ───────────────────────────────────────────────────────

// A plain corner's reachable marker has no single direction to point in — a corner or
// T-junction is itself the decision point. A corridor-run target, by contrast, always
// has exactly one direction (the first step out of the player's own cell), so it renders
// as an arrow instead of a dot to hint which way it leads.
const DIR_ROTATION: Record<Direction, number> = { n: 0, e: 90, s: 180, w: 270 }

// Both markers are outlined and fully opaque, because they have to read on any floor the game has:
// a translucent gold dot was legible against the near-black map this replaced, and disappears into
// pale limestone. The ring is what makes one mark work on light stone and dark granite alike, so the
// player learns a single shape rather than a per-tier one.
const MARKER_FILL = "#ffd766"
const MARKER_OUTLINE = "#161009"

const ReachableDot = () => <circle r={MARKER_RADIUS} fill={MARKER_FILL} stroke={MARKER_OUTLINE} strokeWidth={2} />

/** The corridor marker an offer names — `markerAt` decides it; this only draws it. */
const drawCorridorMarker = (marker: OfferMarker | null) =>
  marker?.kind === "arrow" ? <RunTargetArrow dir={marker.dir} /> : marker?.kind === "dot" ? <ReachableDot /> : null

const RunTargetArrow = ({ dir }: { dir: Direction }) => {
  const r = MARKER_RADIUS * 1.2
  return (
    <polygon
      points={`0,${-r} ${r},${r} ${-r},${r}`}
      fill={MARKER_FILL}
      stroke={MARKER_OUTLINE}
      strokeWidth={2}
      strokeLinejoin="round"
      transform={`rotate(${DIR_ROTATION[dir]})`}
    />
  )
}

/** One cell's marker: the icon in a little `<svg>` of its own, in a box the size of the cell.
 *
 * THE BOX IS THE TAP TARGET, which is what the invisible disc inside the drawing used to be — a marker
 * six units across was a six-unit target, fine with a mouse and small with a thumb. A cell's worth of it
 * is bigger than that disc ever was and cannot poach a neighbour's, because cells do not overlap.
 *
 * The icon stays vector, and stays SVG: these are shapes with a state colour and key badges on them, and
 * a static `<svg>` costs a paint once and never again (docs/instructions/map-rendering.md). The viewBox
 * is centred so everything inside is drawn in the cell-local units it always was, and `overflow: visible`
 * lets a badge sit proud of the cell the way it did.
 */
const MarkerCell = ({
  cx,
  cy,
  onClick,
  children,
}: {
  cx: number
  cy: number
  onClick?: () => void
  children: ReactNode
}) => {
  // A CELL WITH NOTHING TO SAY AND NOTHING TO TAP IS NOT DRAWN. Most of a floor is corridor with no
  // marker on it, and a box with an empty `<svg>` in it for every one of those is several hundred
  // elements that exist to hold nothing.
  if (!children && !onClick) return null
  return (
    <div
      data-marker-cell=""
      onClick={onClick}
      style={{
        position: "absolute",
        left: cx - CELL / 2,
        top: cy - CELL / 2,
        width: CELL,
        height: CELL,
        cursor: onClick ? "pointer" : "default",
        // Only a cell you can act on takes the tap; the rest let a drag or a double-tap through to the map.
        pointerEvents: onClick ? "auto" : "none",
      }}
    >
      {children && (
        <svg
          aria-hidden="true"
          viewBox={`${-CELL / 2} ${-CELL / 2} ${CELL} ${CELL}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        >
          {children}
        </svg>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteMapView = ({
  grid: gridProp,
  onCellClick,
  revealAllCells = false,
  freeWalk = false,
  explorerPos,
  explorerHidden = false,
  ride,
  ridePoses,
  rideFrame,
  squeeze,
  currentFloor,
  pendingCells,
  ownedKeys,
  mechanismStates,
  prompt,
  notice,
  className,
}: Props) => {
  const grid = revealAllCells ? revealAll(gridProp) : gridProp
  const claims = useMemo(() => buildRoomClaims(grid), [grid])
  const tier = useMemo(() => floorTier(grid), [grid])
  const regions = useMemo(() => tileRegionsFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  const wallItems = useMemo(() => wallItemsFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  const covers = useMemo(() => regionBarrierCovers(grid), [grid])
  const barrierCovers = useRegionBarrierCovers(covers, `${grid.siteId}:${currentFloor ?? 0}`)
  // Corridor-run markers track the explorer dot's visual position, not the logical one:
  // hide them the instant a run target is clicked (the player has committed to a
  // destination, so the old markers no longer apply), and don't show the new ones at the
  // far end until the dot actually arrives there rather than while it's still gliding.
  const [settledExplorerPos, setSettledExplorerPos] = useState(explorerPos)
  const isTraveling = !!(
    explorerPos &&
    settledExplorerPos &&
    (explorerPos[0] !== settledExplorerPos[0] || explorerPos[1] !== settledExplorerPos[1])
  )

  const weight = useMemo(
    () =>
      isTraveling || !settledExplorerPos
        ? undefined
        : explorerWeight(grid, currentFloor ?? 0, settledExplorerPos, mechanismStates ?? NO_STATES, ownedKeys),
    [grid, currentFloor, settledExplorerPos, isTraveling, mechanismStates, ownedKeys]
  )
  const nodeSprites = useMemo(
    () =>
      nodeSpritesFor(
        grid,
        claims,
        tier,
        pendingCells,
        mechanismStates,
        currentFloor ?? 0,
        isTraveling ? undefined : settledExplorerPos,
        weight
      ),
    [grid, claims, tier, pendingCells, mechanismStates, currentFloor, isTraveling, settledExplorerPos, weight]
  )
  const drawnPlates = useMemo(
    () => new Set(nodeSprites.flatMap(sprite => (sprite.key.startsWith("plate:") ? [sprite.key] : []))),
    [nodeSprites]
  )
  // The walkable floor, as rectangles: what a layer cut to the floor is cut to. The sand is the only one
  // left — everything else that used to share the map-wide clip now carries its own shape.
  const floorRects = useMemo(() => allFloorRects(regions), [regions])

  // Everything that stands on this floor, in one list: a room's furniture and a node's own, each with
  // the line it stands on. Split at the explorer's own floor line so he is drawn in the middle.
  const standing = useMemo((): StandingSprite[] => {
    const standingOn = explorerPos ? `${explorerPos[0]},${explorerPos[1]}` : null
    // A SQUEEZER IS IN THE CRACK, drawn over the wall he passes: fading it for the side he set out from would ghost the
    // wall he is seen squeezing through.
    const squeezing = squeeze && `${squeeze.traversal.via[0]},${squeeze.traversal.via[1]}`
    const fades = (sprite: NodeSprite) =>
      !!standingOn && !!sprite.fadeAt?.includes(standingOn) && sprite.key.split(":").pop() !== squeezing
    const sprites: StandingSprite[] = nodeSprites.map(sprite => ({
      key: sprite.key,
      // A drop is sorted by its run's floor line, not its bottom edge: the art hangs below the floor, and
      // sorted by its edge it would be drawn over the player standing on it.
      baseY: sprite.key.startsWith("drop:") ? dropFloorLine(sprite) : sprite.y + (sprite.h ?? PROP_H),
      ...(sprite.light ? { light: sprite.light } : {}),
      // A drop is the exception: the player stands IN FRONT of it rather than working it, so on its own
      // mouth the general tie holds (he stands in front of what shares his floor line) and its parapet
      // never covers him. A plate is the other: he stands on it, so it is always under him.
      atExplorer:
        standingOn !== null &&
        !sprite.key.startsWith("drop:") &&
        !sprite.key.startsWith("plate:") &&
        sprite.footprint.includes(standingOn),
      node: (
        <Fragment key={sprite.key}>
          {sprite.url && (
            <Sprite
              data-node-sprite={sprite.key}
              url={sprite.url}
              x={sprite.x}
              y={sprite.y}
              w={sprite.w ?? CELL}
              h={sprite.h ?? PROP_H}
              mirrored={sprite.mirrored}
              filter={STANDING_RELIEF[tier]}
              // ITS OWN ROOM AND NOT THE WHOLE FLOOR: furniture stands off-centre and a sprite is a cell
              // wide, so it reaches past its cell. See NodeSprite.footprint.
              clipTo={footprintRects(sprite.footprint)}
              opacity={
                fades(sprite) ? OCCLUDER_FADE : sprite.badge === "taken" || sprite.spent ? LOOTED_OPACITY : undefined
              }
            />
          )}
          {/* THE STACKING ORDER IS THE POINT, and it is in DOM order (map-rendering.md: depth is DOM
              order, no z-index): the far half above is already painted; the arm rides between it and
              the near half so it rises OUT of the mound rather than sitting on it — see
              `NodeSprite.armStack` and `prim_lever`'s docstring. All three share one frame to the
              pixel, so nothing here computes a per-tile offset: same x/y/w/h as the far half. */}
          {sprite.armStack && (
            <>
              <Sprite
                data-node-sprite={`${sprite.key}:arm`}
                url={sprite.armStack.armUrl}
                x={sprite.x}
                y={sprite.y}
                w={CELL}
                h={PROP_H}
                filter={STANDING_RELIEF[tier]}
                clipTo={footprintRects(sprite.footprint)}
                transform={leverArmTransform(sprite.armStack.angleDeg)}
                // Inside the mound, not at its crown (`prim_lever`'s docstring: the shaft's root sits
                // below the dome's own crown, at 76.6% down the shared frame).
                originXPct={50}
                originYPct={76.6}
                // Transform only, and the DURATION lives in the class rather than inline so
                // `motion-reduce:transition-none` can win over it — an inline style on the same
                // property always beats a stylesheet rule, media query or not.
                className="transition-transform duration-[260ms] ease-out motion-reduce:transition-none"
              />
              <Sprite
                data-node-sprite={`${sprite.key}:front`}
                url={sprite.armStack.frontUrl}
                x={sprite.x}
                y={sprite.y}
                w={CELL}
                h={PROP_H}
                filter={STANDING_RELIEF[tier]}
                clipTo={footprintRects(sprite.footprint)}
              />
            </>
          )}
          {/* ON THE CHEST, NOT ON THE MARKER: the marker's own ✓ is behind the sprite. Sat on the lid,
              where the eye already is. */}
          {sprite.badge && (
            <NodeBadge kind={sprite.badge} x={sprite.x + CELL / 2} y={sprite.y + PROP_H - CELL * 0.62} />
          )}
          {/* ON THE LEAF, for the same reason: a door a lever drives has no marker left to wear it. */}
          {sprite.mark && (
            <MarkArtBadge mark={sprite.mark} x={sprite.x + CELL / 2} y={sprite.y + PROP_H - CELL * 0.62} />
          )}
        </Fragment>
      ),
    }))
    for (const [cellKey, kind] of claims.decorationAt) {
      const [r, c] = cellKey.split(",").map(Number)
      const owner = litClaimOwner(grid, claims, r, c)
      if (!owner) continue
      const { cx, cy } = cellCenter(r, c)
      sprites.push({
        key: `prop:${cellKey}`,
        baseY: cy + CELL / 2,
        node: (
          // A box with no size of its own, standing at the middle of the cell: what is inside it is then
          // drawn in cell-local units, the way it was inside a `<g transform>`.
          <div key={`prop:${cellKey}`} style={{ position: "absolute", left: cx, top: cy, width: 0, height: 0 }}>
            <Decoration
              kind={kind}
              tier={owner.difficulty ?? tier}
              patron={grid.patron}
              seed={`${grid.siteId}:${cellKey}`}
            />
          </div>
        ),
      })
    }
    return sprites.sort((a, b) => a.baseY - b.baseY)
  }, [grid, claims, tier, nodeSprites, explorerPos, squeeze])

  // The line the player stands on. A sprite lower than it is nearer the viewer and is drawn after him;
  // one level with it loses the tie, because the actor belongs in front of the furniture he shares a
  // floor line with — UNLESS that furniture is the room he is standing at (`atExplorer`), which wins
  // the tie instead: a lever the player is stood on has to stay visible while he works it, not vanish
  // behind him.
  const explorerBaseY = explorerPos ? cellCenter(explorerPos[0], explorerPos[1]).cy + CELL / 2 : Infinity
  // A GATE IS DRAWN WITH THE ARCHWAYS, after everything else, for the archway's own reason: it is a
  // thing in the world rather than a decal, so the player walks BEHIND it, and it is hung in the wall
  // band where an arch is — sorted by its floor line among the furniture it came out UNDER the doorway
  // it is fitted into, which put the gate's own head behind a beam. It fades for the two cells it spans
  // (`fadeAt`), exactly as a doorway does, so passing behind it never hides the player.
  // A way a switch shut is keyed `wall:` instead and stays with the furniture — see nodeSpritesFor.
  const isGate = (s: StandingSprite) => s.key.startsWith("gate:")
  const gateSprites = standing.filter(isGate)
  const seated = standing.filter(s => !isGate(s))
  // A RIDER HANGS FROM THE CABLE, so while a ride is drawn the zipline art is behind him whatever its floor
  // line: sorted against the launch, a drop running down the page would otherwise cover the rider on it.
  // ponytail: every drop, not only the one ridden; a floor showing two drops at once can match by run.
  // A SQUEEZER IS IN THE CRACK, so the wall he passes is behind him too: sorted against the side he set out from,
  // a wall below that side would otherwise cover him all the way through.
  const squeezedAt = squeeze && `${squeeze.traversal.via[0]},${squeeze.traversal.via[1]}`
  const underRider = (s: StandingSprite) =>
    (!!ride && s.key.startsWith("drop:")) || (!!squeezedAt && s.key.split(":").pop() === squeezedAt)
  const behindExplorer = seated.filter(
    s => underRider(s) || s.baseY < explorerBaseY || (s.baseY === explorerBaseY && !s.atExplorer)
  )
  const inFrontOfExplorer = seated.filter(
    s => !underRider(s) && (s.baseY > explorerBaseY || (s.baseY === explorerBaseY && s.atExplorer))
  )
  const doorways = useMemo(() => doorwaysFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  // Where the arches are, in the same terms the wall bands are built in, with the stone each one is cut
  // from — the sill in that gap is drawn to match it (see TileLayers.archedGaps).
  // The air on this floor: its rank's, with whatever hour it authors (moodSettings.ts).
  const mood = useMemo(() => moodFor(tier, grid.theme, grid.condition), [tier, grid.theme, grid.condition])
  // Where something living may be: every real floor cell of this floor, explored or not. Deliberately NOT
  // filtered by what the player has seen — see MapLife's `floorCells`: a list that grows as the map is
  // revealed moves everything indexed into it.
  const floorCells = useMemo(() => {
    const cells: Array<readonly [number, number]> = []
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.cells[r][c].type !== "empty") cells.push([r, c])
      }
    }
    return cells
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the SHAPE of the floor, which a reveal never changes
  }, [grid.rows, grid.cols, grid.siteId])
  // Cells with a wall BAND above them, for the roots a condition puts through the brick. Void to the
  // north is the test, which is the same one `wallBehind` uses to stand a prop against a wall — the map
  // only draws a face where there is nothing beyond it.
  const wallBandCells = useMemo(() => {
    const cells: Array<readonly [number, number]> = []
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (grid.cells[r][c].type === "empty") continue
        if (cellAt(grid, r - 1, c).type !== "empty") continue
        // EMPTY IS NOT THE SAME AS SOLID. A chamber's claimed cells are `type: "empty"` in the grid —
        // the claim is a render-time fact — so the void test alone calls the open middle of a room a
        // wall and hangs a root through it, which draws as a dead twig lying on the paving. It is the
        // same blind spot `floorScatter` and `MapGrowth`'s chamber pass both record.
        if (claims.claimedBy.has(`${r - 1},${c}`)) continue
        cells.push([r, c])
      }
    }
    return cells
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the SHAPE of the floor, which a reveal never changes
  }, [grid.rows, grid.cols, grid.siteId, claims])
  // A chamber's own floor, for the big plants. Claimed cells are `type: "empty"` in the grid — the claim
  // is a render-time fact — so this cannot be read off `grid.cells`, which is the trap `floorScatter`
  // documents: walking the grid finds no chamber floor at all.
  const chamberFloorCells = useMemo(
    () => [...claims.claimedBy.keys()].map(key => key.split(",").map(Number) as [number, number]),
    [claims]
  )
  /**
   * Where a TREE may stand, which is not everywhere a plant may.
   *
   * YOU CAN STEP OVER A BUSH AND NOT OVER A TRUNK. A claim is the footprint a room draws over and most
   * of it is void nobody can enter — but not all of it: on a real expert floor 22 of its 101 claimed
   * cells are walkable. A fern or a shrub there is fine and reads as a room grown through. A palm there
   * is a tree in the corridor, and the explorer walks through it.
   *
   * The canopy pass takes the same cell list as the under pass, so the two agree on which member each
   * cell grew; this only says whether the tall one may be drawn at all.
   */
  const treeCells = useMemo(
    () =>
      new Set(
        [...claims.claimedBy.keys()].filter(key => {
          const [row, col] = key.split(",").map(Number)
          return cellAt(grid, row, col).type === "empty"
        })
      ),
    [claims, grid]
  )
  // What light this floor has of its own: a roof that let the plants in let the sun in first, so the
  // night over it comes off and the lamp comes down to match (lighting.ts).
  const daylight = mood.daylight ?? 0
  // Where a roof has given way, and what the explorer's own lamp is already lighting — a shaft hands over
  // to the lamp where the two fall on the same room (see `BeamLight`).
  const shafts = useMemo(
    () => beamShafts(grid, claims, mood.beam ?? 0, grid.siteId, daylight),
    [grid, claims, mood.beam, daylight]
  )
  const torchPlace = useMemo(
    () => new Set(explorerPos ? litPlaceCells(grid, claims, explorerPos) : []),
    [grid, claims, explorerPos]
  )
  // What is strewn on this floor. A function of the floor's shape and its id, so it never moves.
  const scatter = useMemo(() => scatterFor(grid, claims), [grid, claims])
  const drifts = useMemo(() => driftsFor(grid, tier), [grid, tier])
  // The grass is the condition's own ground, so its coverage is the condition's own number.
  const grassMats = useMemo(
    () => (grid.condition?.kind === "overgrown" ? grassMatsFor(grid, grid.condition.amount) : []),
    [grid]
  )
  const archedGaps = useMemo(
    () =>
      new Map(doorways.map(({ row, col, tier: archTier }) => [`${cellLeft(col)},${cellTop(row) - WALL_H}`, archTier])),
    [doorways]
  )
  // One rule for what a tap does, asked per cell below — see `clickTargets.ts`. UNRESOLVED: two
  // positions feed it. Walkability (which corners and drop ends are offered) follows the LIVE explorer,
  // so mid-glide it is already reckoned from the destination; run arrows follow the SETTLED position
  // and vanish while travelling. Whether both should follow one position is a design question.
  // A drop's arrow follows the SETTLED position like run arrows: arrows belong around the dot the player
  // sees, so mid-glide they are gone (the drop end draws a dot) rather than jumping to the destination.
  const offerContext: OfferContext = useMemo(
    () =>
      buildOfferContext(grid, {
        walkFrom: explorerPos,
        runFrom: settledExplorerPos,
        runsSuppressed: isTraveling,
        freeWalk,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, explorerPos?.[0], explorerPos?.[1], settledExplorerPos?.[0], settledExplorerPos?.[1], isTraveling, freeWalk]
  )

  // Must be >= CELL: a fork/endpoint on the map's edge can claim one cell of "outside
  // the grid" void (see cellAt above), and that extra ring needs to physically fit
  // within the padding margin without clipping.
  const svgWidth = mapWidth(grid.cols)
  const svgHeight = mapHeight(grid.rows)

  const { scrollRef, sizerRef, mapRef, zoomRef, scrollHandlers } = useMapZoom(svgWidth, svgHeight)

  useEffect(() => {
    const target = ride?.traversal.to ?? explorerPos
    if (!target || !scrollRef.current || !sizerRef.current) return
    const el = scrollRef.current
    const elRect = el.getBoundingClientRect()
    const mapRect = sizerRef.current.getBoundingClientRect()
    // Origin accounts for the map's own offset within the scroll area (e.g. safe-area padding, centering margin)
    const originX = mapRect.left - elRect.left + el.scrollLeft
    const originY = mapRect.top - elRect.top + el.scrollTop
    // Cell coordinates are in unzoomed SVG units; the rendered map is `zoom` times that size.
    const zoom = zoomRef.current
    // A still frame of a ride centres on the middle of the run, so the whole drop is in view.
    const at = cellCenter(target[0], target[1])
    const from = ride && rideFrame ? cellCenter(ride.traversal.from[0], ride.traversal.from[1]) : at
    const cx = (at.cx + from.cx) / 2
    const cy = (at.cy + from.cy) / 2
    const x = originX + cx * zoom
    const y = originY + cy * zoom
    el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPos?.[0], explorerPos?.[1], ride?.traversal.to[0], ride?.traversal.to[1]])

  const carrying = useMemo(
    () => isCarrying(grid, currentFloor ?? 0, mechanismStates ?? NO_STATES),
    [grid, currentFloor, mechanismStates]
  )

  return (
    /* The map's window, and the frame the air hangs in: the scrolling box is what MOVES, so a weather
       layer inside it would be dragged about with the floor. See MapWeather. */
    <div className={`relative${className ? ` ${className}` : ""}`}>
      <div
        ref={scrollRef}
        {...scrollHandlers}
        data-map-scroll=""
        className="flex size-full overflow-auto pt-safe-top pr-safe-right pb-safe-bottom pl-safe-left"
      >
        {/* Sizer: carries the zoomed footprint so the scroll extents are real, while the map itself
          scales by transform — see useMapZoom. Its size is written there, never by React. */}
        <div ref={sizerRef} className="m-auto shrink-0">
          {/* The map itself: an HTML box the size of the floor, scaled by `useMapZoom`.
              Floor and walls are boxes inside it (`TileLayers`); everything that stands on them is still
              one SVG laid over the top, which is the next slice of docs/instructions/map-rendering.md.
              Both live in the same coordinate space — one unit is one pixel and the zoom is a transform on
              this box — so nothing had to be re-measured to move a layer between them.

              The ground IS stone: a pyramid is carved out of rock, so everything the map has not lit is
              the tier's own dark stone rather than a void. Two things fall out of that — the shape of the
              drawn stone can no longer trace passages the player has not walked, and a pocket enclosed by
              a thick wall stops reading as a hole punched through it.

              Pixel art: no smoothing, so a tile stays crisp instead of turning to mush as the map scales.
              Crisp at every zoom needs useMapZoom to snap to whole steps — not done yet. */}
          <div
            ref={mapRef}
            data-map=""
            role="img"
            aria-label="site map"
            style={{
              position: "relative",
              width: svgWidth,
              height: svgHeight,
              background: tierPalette[tier].wallBase,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          >
            {/* The stone, as one SVG surface under everything — see TileLayers for why it is not HTML. */}
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              aria-hidden="true"
              className="absolute inset-0 block"
            >
              <TileLayers regions={regions} tier={tier} archedGaps={archedGaps} />
            </svg>
            <GroundCover
              grid={grid}
              drifts={drifts}
              url={tileOrPlaceholder(tier, "sand")}
              kind="sand"
              floorRects={floorRects}
            />
            {/* THE GROUND THE GREEN GROWS OUT OF, over the sand and under everything that grows: a tuft
                drawn straight onto bare paving reads as a sticker, and this is what it stands on. Shared
                across the ranks like the growth itself — a condition is something that got into a site,
                not a property of its masonry.

                GRASS RATHER THAN MOSS, and the reason is legibility rather than taste. A mat of moss was
                drawn first and read as OOZE: a rounded, pooled shape in a dark green is what a game
                paints when it means a floor is dangerous to step in, and a covering that half the floor
                wears must never say that. Grass cannot be mistaken for a fluid, because its edge is made
                of blades. */}
            <GroundCover
              grid={grid}
              drifts={grassMats}
              url={sharedTileUrl(growthTile("overgrown", "grass"))}
              kind="grass"
              floorRects={floorRects}
            />
            <FloorScatter grid={grid} scatter={scatter} tier={tier} />
            <ArchShadows doorways={doorways} />
            <MapLife
              mood={mood}
              siteId={grid.siteId}
              floorCells={floorCells}
              isLit={(r, c) => {
                const cell = cellAt(grid, r, c)
                return cell.type !== "empty" && cell.state !== "fogged"
              }}
            />
            {/* Over the scarabs, under the wall items: something growing out of a wall is in front of the
              floor and behind whatever is hung on that wall. */}
            <MapGrowth
              mood={mood}
              siteId={grid.siteId}
              tier={tier}
              floorCells={floorCells}
              wallCells={wallBandCells}
              chamberCells={chamberFloorCells}
              isLit={(r, c) => {
                const cell = cellAt(grid, r, c)
                if (cell.type !== "empty") return cell.state !== "fogged"
                // A CLAIMED cell is `type: "empty"` in the grid — the claim is a render-time fact — so a
                // chamber's own floor fails the test above and every plant on it was dropped. It is lit
                // when its ROOM is, which is the same blind spot `floorScatter` records for scatter.
                const owner = claims.claimedBy.get(`${r},${c}`)
                if (!owner) return false
                const [or, oc] = owner.split(",").map(Number)
                const room = cellAt(grid, or, oc)
                return room.type !== "empty" && room.state !== "fogged"
              }}
            />
            <WallItems items={wallItems} patron={grid.patron} />

            {/* THE WATER OR SAND OVER A SHUT REGION BARRIER, under the shade and the lamp so the floor's
                own light is what tints it, and under the markers and everything standing so a mark on the
                blockage reads above it. */}
            <RegionBarrierCovers
              grid={grid}
              tier={tier}
              standing={barrierCovers.standing}
              leaving={barrierCovers.leaving}
            />

            {/* The dark, and then the light in it: the place the explorer is standing is the hole the
              lamp burns in the shade, so it has to be laid over the shade rather than under it. */}
            <FloorShade tier={tier} strength={floorNight(daylight)} />
            <LitPlaces grid={grid} claims={claims} at={explorerPos} strength={lampStrength(daylight)} />
            {/* And the rooms daylight is already falling into, lamp or no lamp. */}
            <BeamLight grid={grid} claims={claims} shafts={shafts} torchPlace={torchPlace} daylight={daylight} />

            {/* THE MARKERS: an icon per cell, each in a little `<svg>` of its own — a shape per kind, a
                colour per state, key badges on the rim. Over the stone, under everything standing on it,
                and the only layer that takes a tap. Vector, and staying vector: a static drawing costs a
                paint once and never again; it was animation inside SVG that cost the map everything. */}
            {Array.from({ length: grid.rows + 2 }, (_, ri) => {
              const r = ri - 1
              return Array.from({ length: grid.cols + 2 }, (_, ci) => {
                const c = ci - 1
                const cell = cellAt(grid, r, c)
                const { cx, cy } = cellCenter(r, c)
                const cellKey = `${r},${c}`
                const claimOwner = litClaimOwner(grid, claims, r, c)

                // A cell claimed by a neighboring room — genuine void (including one step
                // outside the grid), or a corridor absorbed as a gate's approach or a
                // diagonal's flank anchor (see buildRoomClaims) — renders as part of that
                // room, always, using the OWNER's state for the floor tint. The claim shape
                // is a static function of the finished grid (independent of exploration
                // progress), so the whole blob must render as a single visual unit — hiding
                // a claimed corridor while its own fog state lags behind the owner's is what
                // punched the "spotty" holes in an otherwise-explored room. Click/interaction
                // still uses the corridor's own state, since it's a real, independently
                // progressed passage for gameplay purposes even though it looks unified.
                //
                // **A fogged owner takes only what is its own.** Its void cells go dark with it, but a
                // claimed CORRIDOR is a real passage the player may already have lit from the far end —
                // it falls through to the corridor rendering below and stands on its own state, rather
                // than leaving the rooms around it opening onto a gap that draws nothing.
                if (claimOwner) {
                  const offer = clickTargetAt(grid, claims, r, c, offerContext)
                  return (
                    <MarkerCell
                      key={cellKey}
                      cx={cx}
                      cy={cy}
                      onClick={offer && onCellClick ? () => onCellClick(offer[0], offer[1]) : undefined}
                    >
                      {cell.type === "corridor" &&
                        drawCorridorMarker(markerAt(grid, claims, r, c, offerContext, offer))}
                    </MarkerCell>
                  )
                }

                if (cell.type === "empty") return null
                if (cell.state === "fogged") return null

                if (cell.type === "corridor") {
                  const offer = clickTargetAt(grid, claims, r, c, offerContext)
                  return (
                    <MarkerCell
                      key={`${r},${c}`}
                      cx={cx}
                      cy={cy}
                      onClick={offer && onCellClick ? () => onCellClick(offer[0], offer[1]) : undefined}
                    >
                      {drawCorridorMarker(markerAt(grid, claims, r, c, offerContext, offer))}
                    </MarkerCell>
                  )
                }

                // room cell
                const state = cell.state
                // Reached, and done with. A room its family keeps open is reached and never done with, so it
                // is left out of everything below that says finished — the dim and the ✓ alike.
                // A USED ACTIVATOR IS DONE, THOUGH ITS ROOM STAYS OPEN: a lit torch has nothing left to offer, so
                // it wears the dim and the ✓ a finished room does. Read off the mechanism's position, so it
                // shows without the player touching it; an unlit one wears neither.
                const spent = isSpentAt(grid, currentFloor ?? 0, r, c, cell, mechanismStates)
                // A SEQUENCE TILE SAYS HOW THE RUN STANDS ON IT, never "done": walked is its own look.
                const plateStatus = tileStatusAt(grid, currentFloor ?? 0, r, c, mechanismStates)
                const isCompleted =
                  (state === "completed" && !staysOpen(cell) && !cell.sequenceTile && !cell.plate) || spent
                // Only ever a pending-loot marker for a treasure room with a consumable reward — this
                // guards against stale coordinates in pendingCells (e.g. left over from before a site
                // was regenerated) painting the badge onto whatever room now occupies that cell.
                const shapeKind = shapeKindFor(grid, r, c, cell)
                // Portals (entrance/stairhead/exit) are transitions, not tasks — they can't be
                // "completed", so they never get the completed dim or the ✓ badge even though the
                // entrance is always marked explored (useAssembledFloor) and used staircases complete.
                const isPortal = shapeKind === "entrance" || shapeKind === "stairhead" || shapeKind === "exit"
                const isPending =
                  isCompleted &&
                  shapeKind === "treasure" &&
                  cell.reward?.type === "consumable" &&
                  (pendingCells?.has(`${r},${c}`) ?? false)
                const offer = clickTargetAt(grid, claims, r, c, offerContext)
                // A fogged room never reaches here — the loop above draws unlit cells — so no guard is
                // needed to keep a chest out of the dark.
                const hasChest = shapeKind === "treasure" && !cell.tags?.includes("shop")
                // A stairhead at the floor's own entrance is the way back UP; any other descends.
                const isStair = shapeKind === "stairhead"
                const goesUp = isStair && r === grid.entrancePos[0] && c === grid.entrancePos[1]
                const hasStair =
                  isStair && !!tileOrPlaceholder(cell.difficulty ?? tier, goesUp ? "stair-up" : "stair-down")
                // A DRAWN EXIT LOSES ITS MARKER for the stairhead's reason: the art IS the node, and unlike
                // a gate it carries no key colour and no state — a portal is a transition, never completed
                // — so the vector has nothing left to say that the doorway does not say better.
                const hasExit = shapeKind === "exit" && !!tileOrPlaceholder(cell.difficulty ?? tier, "exit")
                // A PAINTED PLATE IS THE NODE, as a flight is: the vector slab underneath has nothing more to say.
                const hasPlate = drawnPlates.has(`plate:${r},${c}`)
                const roomR = nodeRadius[shapeKind]
                // A WAY A SWITCH SHUT IS A WALL, AND A WALL WEARS NO NODE. The bars standing in its doorway
                // already say the way is closed; a gate marker on top of them offers a second reading — a
                // door to walk up to and be told what it wants — which is the one thing this cell is not.
                // Every other gate carries the family that renders it, and keeps its marker.
                const sealedWay = isSealedWayOut(cell)
                const locked = isLockedGate(cell, ownedKeys)
                const displayState: CellState = locked && state === "reachable" ? "visible" : state

                return (
                  <Fragment key={`${r},${c}`}>
                    <MarkerCell
                      cx={cx}
                      cy={cy}
                      onClick={offer && onCellClick ? () => onCellClick(offer[0], offer[1]) : undefined}
                    >
                      {/* A FLIGHT SAYS STAIRS BETTER THAN A MARKER DOES, so where one is drawn the marker
                        goes out entirely rather than merely easing back the way a chest's does. The
                        stair is the only node whose art IS the node — a chest stands BESIDE a treasure
                        room's marker and still needs it to say which room — so this is the one place the
                        vector can be spared. Opacity rather than a skipped render, which keeps every cell's
                        drawing the same shape whatever is on it; the tap is the cell's own box either way. */}
                      <g
                        data-shape-kind={shapeKind}
                        opacity={
                          sealedWay || hasStair || hasExit || hasPlate
                            ? 0
                            : isCompleted && !isPending && !isPortal
                              ? 0.45
                              : hasChest
                                ? NODE_OVER_ART_OPACITY
                                : 1
                        }
                      >
                        <NodeShape
                          type={shapeKind}
                          state={displayState}
                          gateVariant={cell.gateVariant}
                          keyColor={cell.keyColor}
                          keyColors={cell.keyColors}
                          difficulty={wardKeyDifficulty(cell.requiredKeyId)}
                          icon={familyIconOf(cell)}
                          mark={cell.mark}
                          plate={
                            cell.sequenceTile && plateStatus
                              ? { glyph: cell.sequenceTile.glyph, status: plateStatus }
                              : undefined
                          }
                        />
                      </g>
                      {/* A chest wears its own badge (`nodeSpritesFor`), because it stands over this one. */}
                      {isCompleted &&
                        !isPortal &&
                        !hasChest &&
                        shapeKind !== "fork" &&
                        (isPending ? <PendingLootBadge r={roomR} /> : <CompletedBadge r={roomR} />)}
                    </MarkerCell>
                  </Fragment>
                )
              })
            })}

            {/* EVERYTHING STANDING ON THE FLOOR IS SORTED AGAINST THE PLAYER, and the player is drawn in
              the middle of it. Anything whose floor line is LOWER than his is nearer the viewer and is
              drawn after him, so he passes behind the chest at the front of a room and in front of the
              one at the back. Sorting by the floor line and not by the sprite's top is what makes a
              tall thing still stand behind a short thing in front of it — and the sort IS the DOM order
              here, so nothing needs a z-index.

              A node's furniture is additionally clipped to its own room, in MAP space: a sprite that
              carries a clip is laid out as a full-map layer with the art placed by background-position,
              which is why the footprint path needs no translating (see `Sprite`). */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              {/* The floor light first, so everything standing is standing IN it. */}
              {standing.map(s2 =>
                s2.light ? <LightPool key={`light:${s2.key}`} r={s2.light.r} cx={s2.light.x} cy={s2.light.y} /> : null
              )}

              <StandingLayer sprites={behindExplorer} />

              {explorerPos && !explorerHidden && (
                <ExplorerDot
                  key={currentFloor}
                  grid={grid}
                  pos={explorerPos}
                  carrying={carrying}
                  onArrive={() => setSettledExplorerPos(explorerPos)}
                />
              )}
              {ride &&
                (rideFrame ? (
                  <RiderSprite ride={ride} at={rideFrame} pose={poseFor(ride.traversal.dir, ridePoses)} />
                ) : (
                  <ZiplineRider ride={ride} poses={ridePoses} />
                ))}
              {squeeze && <SqueezeRider squeeze={squeeze} />}

              <StandingLayer sprites={inFrontOfExplorer} />

              {/* THE TALL PLANTS, over everything that walks. A palm is half again the height of the
                  explorer, so drawing it under them would put a person in front of a tree — and it
                  fades while they are behind it, the bargain an archway makes for the same reason.
                  Nothing here is in anybody's way: a chamber plant only ever stands on a CLAIMED cell,
                  which is `type: "empty"` in the grid and so is never walked on. */}
              <MapGrowth
                mood={mood}
                siteId={grid.siteId}
                tier={tier}
                floorCells={floorCells}
                chamberCells={chamberFloorCells}
                canopy
                treeCells={treeCells}
                explorerPos={explorerPos}
                isLit={(r, c) => {
                  const owner = claims.claimedBy.get(`${r},${c}`)
                  if (!owner) return false
                  const [or, oc] = owner.split(",").map(Number)
                  const room = cellAt(grid, or, oc)
                  return room.type !== "empty" && room.state !== "fogged"
                }}
              />

              {/* Last, so a doorway passes in FRONT of the player walking under it — see Archways. */}
              <Archways doorways={doorways} explorerPos={explorerPos} />

              {/* And the gate in front of the arch it is fitted into: the frame is the masonry of the
              opening, the gate is what has been hung in it, so the leaf is the nearer of the two. */}
              <StandingLayer sprites={gateSprites} />

              {/* The shade's second pass — see FloorShade. Everything standing has to be in the dark
                with the floor, or it reads as cut out and pasted on. */}
              <FloorShade tier={tier} strength={SEATING_PASS * floorNight(daylight)} />

              {/* AND THE LIGHT'S SECOND PASS OVER IT, for the same reason read the other way round: what
                stands in a lit room is standing in the light, and the wash above took a quarter of the
                tier's night back over everything the lamp had just reached. The explorer came out of it
                darker than the floor under their feet. Lighter than the first pass and reaching a band
                higher (see `headroom`), so the furniture is lit to the top of its own headroom rather
                than sawn off at the floor line. */}
              <LitPlaces
                grid={grid}
                claims={claims}
                at={explorerPos}
                strength={lampStandingStrength(daylight)}
                headroom
              />
              <BeamLight
                grid={grid}
                claims={claims}
                shafts={shafts}
                torchPlace={torchPlace}
                daylight={daylight}
                headroom
              />

              {/* The cones after every light: a shaft of dust is between the eye and the room, so it stands in
                front of the statue it falls on rather than behind it. */}
              <BeamShafts grid={grid} claims={claims} shafts={shafts} siteId={grid.siteId} floorRects={floorRects} />

              {/* AFTER THE LIGHT AND THE SHADE, and last of everything: the prompt is a thing the player
                  taps rather than a thing in the room, so neither pass may dim it and nothing standing
                  may cover it. It also opts back into hit-testing, inside a layer that has none. */}
              {prompt && (
                <div
                  data-map-prompt=""
                  style={{
                    position: "absolute",
                    left: cellCenter(prompt.at[0], prompt.at[1]).cx,
                    top: cellCenter(prompt.at[0], prompt.at[1]).cy - CELL * 0.7,
                    transform: "translate(-50%, -100%)",
                    pointerEvents: "auto",
                  }}
                >
                  <MapActionPrompt label={prompt.label} onClick={prompt.onTake} />
                </div>
              )}
              {/* THE LIVE REGION IS ALWAYS IN THE PAGE and only its text is swapped: a region inserted together with
                  its text is not announced, one that was already there is. */}
              <div
                role="status"
                data-map-notice=""
                style={
                  notice
                    ? {
                        position: "absolute",
                        left: cellCenter(notice.at[0], notice.at[1]).cx,
                        top: cellCenter(notice.at[0], notice.at[1]).cy - CELL * 0.7,
                        transform: "translate(-50%, -100%)",
                      }
                    : { position: "absolute" }
                }
              >
                {notice && <MapNotice label={notice.label} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The air, over the stone and over the player: what is carried on it, and what hour it is. Over the
          SCROLLING BOX rather than inside it — air belongs to the window, not to the floor. */}
      <MapWeather mood={mood} siteId={grid.siteId} />
    </div>
  )
}
