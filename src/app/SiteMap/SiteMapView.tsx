import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type {
  CellState,
  DecorationKind,
  Difficulty,
  Direction,
  FloorGrid,
  GateVariant,
  GridCell,
  KeyColor,
  RoomCell,
  RoomType,
  WallDecorationKind,
} from "../../game/siteTypes"
import { wardKeyDifficulty } from "../../data/difficultyLevels"
import { revealAll, walkableFrom } from "../../game/gridNavigation"
import { keyColorHex } from "@/ui/tokens/keyColors"
import { ExplorerDot } from "./ExplorerDot"
import { useMapZoom } from "./useMapZoom"
import {
  CELL,
  MARKER_HIT,
  MARKER_RADIUS,
  NODE_RADIUS_FORK,
  NODE_RADIUS_LARGE,
  NODE_RADIUS_PUZZLE,
  ARCH_H,
  ARCH_RISE,
  ARCH_W,
  SIDE_W,
  WALL_H,
  cellCenter,
  cellLeft,
  cellTop,
  mapHeight,
  mapWidth,
} from "./mapScale"
import { corridorShade, stateWash, tierPalette } from "./tileMaterials"
import { moodFor } from "./moodSettings"
import { MapLife, MapWeather } from "./MapMood"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import {
  ALL_STATES,
  buildTileRegions,
  faceShadowsToPath,
  faceTopsToPath,
  hasWallFace,
  rectsToPath,
} from "./tileRegions"
import type { Rect } from "./tileRegions"
import type { FloorAt, TileRegions } from "./tileRegions"

// Cells one step outside the grid are still real void for claiming purposes — a fork or
// endpoint sitting on the map's edge shouldn't look artificially clipped next to one
// that happens to have interior void around it. Anything beyond the grid is `empty`.
const cellAt = (grid: FloorGrid, r: number, c: number): GridCell => grid.cells[r]?.[c] ?? { type: "empty" }

type Props = {
  grid: FloorGrid
  onCellClick?: (row: number, col: number) => void
  revealAllCells?: boolean
  explorerPos?: readonly [number, number]
  /** Current floor index. Keys the explorer dot so a floor switch remounts it (instant snap to the
   * new floor's entrance) instead of animating a walk from the previous floor's coordinates. */
  currentFloor?: number
  /** "row,col" keys of completed treasure cells with a reward still waiting to be picked up */
  pendingCells?: ReadonlySet<string>
  /** Keys the player already holds — used only to color a gate as locked/unlocked on the map. */
  ownedKeys?: ReadonlySet<string>
  className?: string
}

const entranceFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#281c08",
  reachable: "#2a2010",
  completed: "#2a2010",
}
const entranceStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#c09030",
  reachable: "#d0a840",
  completed: "#d0a840",
}

const EntranceShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_LARGE
  const fill = entranceFill[state]
  const stroke = entranceStroke[state]
  // arch: flat bottom, semicircle top
  const archPath = `M ${-r},${r} L ${-r},0 A ${r},${r} 0 0,1 ${r},0 L ${r},${r} Z`
  return (
    <>
      <path d={archPath} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && (
        <polygon points={`0,${-r + 4} 5,0 3,0 3,${r - 4} -3,${r - 4} -3,0 -5,0`} fill={entranceStroke[state]} />
      )}
    </>
  )
}

// ─── Completed overlay ────────────────────────────────────────────────────────

const CompletedBadge = ({ r }: { r: number }) => (
  <g transform={`translate(${r - 7}, ${r - 7})`}>
    <circle r={7} fill="#0e1e14" stroke="#3a8858" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#60c080" style={{ userSelect: "none" }}>
      ✓
    </text>
  </g>
)

// A treasure that couldn't be picked up (inventory was full) — still waiting to be looted
const PendingLootBadge = ({ r }: { r: number }) => (
  <g transform={`translate(${r - 7}, ${r - 7})`}>
    <circle r={7} fill="#2a1e08" stroke="#d0a840" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#f0c860" style={{ userSelect: "none" }}>
      !
    </text>
  </g>
)

// ─── Node shape geometry ──────────────────────────────────────────────────────

type ShapeProps = {
  state: CellState
  gateVariant?: GateVariant
  keyColor?: KeyColor
  keyColors?: KeyColor[]
  // A ward (tomb-key) gate's tier, derived from its key id — tints the gate by difficulty.
  difficulty?: Difficulty
}

const PuzzleShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_PUZZLE
  const fill = puzzleFill[state]
  const stroke = puzzleStroke[state]
  return (
    <>
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && (
        <>
          <circle cx={-r + 4} cy={-r + 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={r - 4} cy={-r + 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={-r + 4} cy={r - 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={r - 4} cy={r - 4} r={2} fill={stroke} opacity={0.7} />
        </>
      )}
      {state !== "fogged" && (
        <g fill={puzzleIcon[state]}>
          {(
            [
              [-8, -8],
              [2, -8],
              [-8, 2],
              [2, 2],
            ] as const
          ).map(([x, y]) => (
            <rect key={`${x},${y}`} x={x} y={y} width={6} height={6} rx={1} />
          ))}
        </g>
      )}
    </>
  )
}

const trapFill: Record<CellState, string> = {
  fogged: "#1a0808",
  visible: "#2a0e08",
  reachable: "#2a1010",
  completed: "#2a1010",
}
const trapStroke: Record<CellState, string> = {
  fogged: "#2e1010",
  visible: "#903010",
  reachable: "#c04020",
  completed: "#c04020",
}

const TrapShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_PUZZLE
  const fill = trapFill[state]
  const stroke = trapStroke[state]
  return (
    <>
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && (
        // Skull: dome + eye sockets + teeth
        <g fill={stroke}>
          {/* Cranium */}
          <ellipse cx={0} cy={-2} rx={6} ry={5.5} />
          {/* Eye sockets */}
          <ellipse cx={-2.5} cy={-2} rx={1.8} ry={2} fill={fill} />
          <ellipse cx={2.5} cy={-2} rx={1.8} ry={2} fill={fill} />
          {/* Jaw / teeth */}
          <rect x={-5} y={2.5} width={3} height={3} rx={0.5} />
          <rect x={-1} y={2.5} width={2} height={3} rx={0.5} />
          <rect x={2} y={2.5} width={3} height={3} rx={0.5} />
        </g>
      )}
    </>
  )
}

const ForkShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_FORK
  const stroke = state === "fogged" ? "#2e2018" : "#5a4a30"
  return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill="#1e160e" stroke={stroke} strokeWidth={1.5} />
}

const GateNodeShape = ({ state, gateVariant, keyColor, difficulty }: ShapeProps) => {
  const r = NODE_RADIUS_LARGE
  const isTomb = gateVariant === "tomb-key"
  const colorKey = state === "visible" ? "visible" : "reachable"
  const fill = isTomb ? tombGateFill[state] : gateFill[state]
  // A ward gate is tinted by its key's difficulty tier (so the map reads which tier a locked ward
  // belongs to); tombGate* stays the fallback when no difficulty is known (or the default purple).
  const tombAccent = difficulty ? DIFFICULTY_GATE_ACCENT[difficulty][colorKey] : undefined
  const stroke =
    state === "fogged"
      ? isTomb
        ? tombGateStroke[state]
        : gateStroke[state]
      : isTomb
        ? (tombAccent ?? tombGateStroke[state])
        : keyColor
          ? keyColorHex[keyColor][colorKey]
          : gateStroke[state]
  const barColor =
    state === "fogged"
      ? "#3a2a10"
      : isTomb
        ? (tombAccent ?? (colorKey === "visible" ? "#8040c0" : "#9060e0"))
        : keyColor
          ? keyColorHex[keyColor][colorKey]
          : colorKey === "visible"
            ? "#c04020"
            : "#c09020"
  return (
    <>
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && keyColor && !isTomb && (
        <rect
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          rx={1}
          fill={keyColorHex[keyColor][colorKey]}
          fillOpacity={0.18}
        />
      )}
      {state !== "fogged" &&
        [-r / 3, 0, r / 3].map(bx => (
          <line
            key={bx}
            x1={bx}
            y1={-r + 3}
            x2={bx}
            y2={r - 3}
            stroke={barColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
      {state !== "fogged" && (
        <line x1={-r + 3} y1={-r / 3} x2={r - 3} y2={-r / 3} stroke={barColor} strokeWidth={1.5} />
      )}
    </>
  )
}

const TreasureShape = ({ state, keyColor, keyColors }: ShapeProps) => {
  const r = NODE_RADIUS_LARGE
  const colorKey = state === "visible" ? "visible" : "reachable"
  const badges = keyColors && keyColors.length > 0 ? keyColors : keyColor ? [keyColor] : []
  const primaryColor = badges[0]
  const fill = treasureFill[state]
  const stroke = state !== "fogged" && primaryColor ? keyColorHex[primaryColor][colorKey] : treasureStroke[state]
  // Badge positions: single circle at top-right; multiple stacked in a column, 2-col for 4+
  const badgePositions = (n: number): [number, number][] => {
    if (n === 1) return [[9, -9]]
    if (n <= 3) return Array.from({ length: n }, (_, i) => [9, -12 + i * 6] as [number, number])
    return Array.from({ length: n }, (_, i) => [i % 2 === 0 ? 6 : 12, -12 + Math.floor(i / 2) * 6] as [number, number])
  }
  const positions = badgePositions(badges.length)
  const badgeR = badges.length === 1 ? 4 : 3
  return (
    <>
      <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && primaryColor && (
        <polygon
          points={`0,${-r} ${r},0 0,${r} ${-r},0`}
          fill={keyColorHex[primaryColor][colorKey]}
          fillOpacity={0.18}
        />
      )}
      {state !== "fogged" && (
        <polygon
          points="0,-9 2.4,-3.2 8.6,-2.8 3.8,1.2 5.3,7.3 0,4 -5.3,7.3 -3.8,1.2 -8.6,-2.8 -2.4,-3.2"
          fill={treasureIcon[state]}
        />
      )}
      {state !== "fogged" &&
        badges.map((color, i) => (
          <circle
            key={color}
            cx={positions[i][0]}
            cy={positions[i][1]}
            r={badgeR}
            fill={keyColorHex[color][colorKey]}
          />
        ))}
    </>
  )
}

const StairheadShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_LARGE
  const cut = 6
  const fill = stairFill[state]
  const stroke = stairStroke[state]
  const pts = [
    `-${r - cut},-${r}`,
    `${r - cut},-${r}`,
    `${r},-${r - cut}`,
    `${r},${r - cut}`,
    `${r - cut},${r}`,
    `-${r - cut},${r}`,
    `-${r},${r - cut}`,
    `-${r},-${r - cut}`,
  ].join(" ")
  return (
    <>
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && (
        <path d="M -9,-7 L -3,-7 L -3,-2 L 3,-2 L 3,3 L 9,3 L 9,9 L -9,9 Z" fill={stairIcon[state]} />
      )}
    </>
  )
}

const ExitShape = ({ state }: ShapeProps) => {
  const r = NODE_RADIUS_LARGE
  const fill = exitFill[state]
  const stroke = exitStroke[state]
  return (
    <>
      <circle r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
      {state !== "fogged" && <circle r={r - 6} fill="none" stroke={stroke} strokeWidth={1} opacity={0.4} />}
      {state !== "fogged" && <polygon points="0,-9 6,-3 3,-3 3,8 -3,8 -3,-3 -6,-3" fill={exitIcon[state]} />}
    </>
  )
}

// The visual shape a room takes. "encounter" rooms pick among the hand-drawn
// puzzle/trap/treasure/gate shapes by family tag; "portal" rooms (entrance/stairhead/exit
// are all `RoomType: "portal"` — pure transitions, no family) pick by position/stairId.
type ShapeKind = "entrance" | "puzzle" | "trap" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

const shapeKindFor = (
  grid: FloorGrid,
  r: number,
  c: number,
  roomType: RoomType,
  tags: string[] | undefined,
  stairId: string | undefined
): ShapeKind => {
  if (roomType === "fork") return "fork"
  if (roomType === "portal") {
    if (stairId) return "stairhead"
    return r === grid.entrancePos[0] && c === grid.entrancePos[1] ? "entrance" : "exit"
  }
  if (tags?.includes("gate")) return "gate"
  if (tags?.includes("trap")) return "trap"
  if (tags?.includes("treasure") || tags?.includes("shop")) return "treasure"
  return "puzzle"
}

// Gating is soft: a locked gate is still "reachable" (clickable), so `state` doesn't distinguish
// locked from unlocked. This recovers that purely cosmetic distinction for the icon AND the floor
// tint under it, and never for clickability or badges.
const isLockedGate = (cell: RoomCell, ownedKeys: ReadonlySet<string> | undefined): boolean =>
  cell.tags?.includes("gate") === true && !!cell.requiredKeyId && !(ownedKeys?.has(cell.requiredKeyId) ?? false)

const nodeRadius: Record<ShapeKind, number> = {
  entrance: NODE_RADIUS_LARGE,
  puzzle: NODE_RADIUS_PUZZLE,
  trap: NODE_RADIUS_PUZZLE,
  fork: NODE_RADIUS_FORK,
  gate: NODE_RADIUS_LARGE,
  treasure: NODE_RADIUS_LARGE,
  stairhead: NODE_RADIUS_LARGE,
  exit: NODE_RADIUS_LARGE,
}

const NodeShape = ({ type, state, gateVariant, keyColor, keyColors, difficulty }: ShapeProps & { type: ShapeKind }) => {
  const p = { state, gateVariant, keyColor, keyColors, difficulty }
  switch (type) {
    case "entrance":
      return <EntranceShape {...p} />
    case "puzzle":
      return <PuzzleShape {...p} />
    case "trap":
      return <TrapShape {...p} />
    case "fork":
      return <ForkShape {...p} />
    case "gate":
      return <GateNodeShape {...p} />
    case "treasure":
      return <TreasureShape {...p} />
    case "stairhead":
      return <StairheadShape {...p} />
    case "exit":
      return <ExitShape {...p} />
  }
}

// ─── Color palettes per room type ─────────────────────────────────────────────

const puzzleFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#2a1e08",
  reachable: "#1a2a10",
  completed: "#1a2a10",
}
const puzzleStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#7a5010",
  reachable: "#507030",
  completed: "#507030",
}
const puzzleIcon: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#d09030",
  reachable: "#90c060",
  completed: "#90c060",
}

const gateFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#281408",
  reachable: "#1e1a08",
  completed: "#1e1a08",
}
const gateStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#883010",
  reachable: "#887020",
  completed: "#887020",
}

const tombGateFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#140820",
  reachable: "#10102a",
  completed: "#10102a",
}
const tombGateStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#604898",
  reachable: "#7060c0",
  completed: "#7060c0",
}

// Ward (tomb-key) gate tint per difficulty tier — `visible` is the dimmer locked hue, `reachable`
// the brighter one (also used for `completed`). Hues track the tier material palette
// (difficultyColors.ts): stone / amber / slate / gold / emerald.
const DIFFICULTY_GATE_ACCENT: Record<Difficulty, { visible: string; reachable: string }> = {
  starter: { visible: "#8a857e", reachable: "#c4bcb2" },
  junior: { visible: "#c2740e", reachable: "#f59e0b" },
  expert: { visible: "#586274", reachable: "#94a3b8" },
  master: { visible: "#c2a10b", reachable: "#eab308" },
  wizard: { visible: "#0e9268", reachable: "#10b981" },
}

const treasureFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#281808",
  reachable: "#221808",
  completed: "#221808",
}
const treasureStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#986020",
  reachable: "#b08030",
  completed: "#b08030",
}
const treasureIcon: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#c08030",
  reachable: "#d0a040",
  completed: "#d0a040",
}

const stairFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#181020",
  reachable: "#141028",
  completed: "#141028",
}
const stairStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#604880",
  reachable: "#7060b0",
  completed: "#7060b0",
}
const stairIcon: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#9070c0",
  reachable: "#a090d0",
  completed: "#a090d0",
}

const exitFill: Record<CellState, string> = {
  fogged: "#1a1208",
  visible: "#201c08",
  reachable: "#1c2008",
  completed: "#1c2008",
}
const exitStroke: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#909020",
  reachable: "#a0b020",
  completed: "#a0b020",
}
const exitIcon: Record<CellState, string> = {
  fogged: "#2e2010",
  visible: "#c0c030",
  reachable: "#d0d850",
  completed: "#d0d850",
}

// ─── Floor tiles ────────────────────────────────────────────────────────────────
// Every occupied cell (room or corridor) is a floor tile composited from a full-cell
// fill plus 0-4 wall strips, chosen per side from the same `dirs` bitmask the future
// sprite-tile renderer will use (see docs/game-design/spritesheet-renderer-prep.md).

const DIR_MOVES: Record<Direction, readonly [number, number]> = {
  n: [-1, 0],
  s: [1, 0],
  e: [0, 1],
  w: [0, -1],
}

// Forks and dead-end (leaf) treasure/stairhead/exit rooms claim adjacent grid cells as
// part of their own footprint — real extra tiles, grid-aligned, rather than a rendering
// stretch. That keeps every room shape made of whole cells, which is what the eventual
// sprite-tile renderer needs to tile cleanly (see
// docs/game-design/spritesheet-renderer-prep.md). Purely derived at render time from
// the existing grid — no generation-side bookkeeping.
const canClaimVoid = (
  grid: FloorGrid,
  r: number,
  c: number,
  roomType: RoomType,
  tags: string[] | undefined,
  stairId: string | undefined,
  dirsSize: number
): boolean => {
  if (roomType === "fork") return true
  const kind = shapeKindFor(grid, r, c, roomType, tags, stairId)
  return (kind === "treasure" || kind === "stairhead" || kind === "exit") && dirsSize === 1
}

const ORTHO_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]
// Each diagonal offset paired with the two orthogonal offsets flanking it — a diagonal
// only joins the claim if at least one flank "belongs" to the owner too (either also
// claimed void, or the owner's own real corridor arm), otherwise it'd be a tile touching
// the room by a single corner point with walls on all 4 sides (nothing to open toward),
// which reads as a floating box rather than part of the room.
const DIAGONAL_OFFSETS: ReadonlyArray<{
  offset: readonly [number, number]
  flanks: readonly [readonly [number, number], readonly [number, number]]
}> = [
  {
    offset: [-1, -1],
    flanks: [
      [-1, 0],
      [0, -1],
    ],
  },
  {
    offset: [-1, 1],
    flanks: [
      [-1, 0],
      [0, 1],
    ],
  },
  {
    offset: [1, -1],
    flanks: [
      [1, 0],
      [0, -1],
    ],
  },
  {
    offset: [1, 1],
    flanks: [
      [1, 0],
      [0, 1],
    ],
  },
]

// A neighbor is claimable if it's genuine void (`empty`), or — the one exception — a
// single corridor tile that only exists to *approach* a gate: either a real gate room
// two steps away (revealed), or a corridor stub whose far side got masked to `empty`
// because it leads into an undetected hidden section. Either way that corridor tile
// reads better as the junction's own doorway than as a separate hallway segment.
// Diagonal neighbors can only ever be void — a real edge is never diagonal.
const isClaimableNeighbor = (grid: FloorGrid, ownerR: number, ownerC: number, nr: number, nc: number): boolean => {
  const cell = cellAt(grid, nr, nc)
  if (cell.type === "empty") return true
  if (cell.type !== "corridor") return false
  const dr = nr - ownerR,
    dc = nc - ownerC
  if (Math.abs(dr) + Math.abs(dc) !== 1) return false
  const beyond = grid.cells[ownerR + dr * 2]?.[ownerC + dc * 2]
  const leadsToGate = beyond?.type === "room" && !!beyond.tags?.includes("gate")
  return leadsToGate || cell.dirs.size === 1
}

const OFFSET_TO_DIR: Record<string, Direction> = { "-1,0": "n", "1,0": "s", "0,-1": "w", "0,1": "e" }
const edgeKey = (r1: number, c1: number, r2: number, c2: number): string => {
  const a = `${r1},${c1}`,
    b = `${r2},${c2}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

type RoomClaims = {
  /** claimed-cell key ("r,c") -> owning room's key ("r,c") */
  claimedBy: ReadonlyMap<string, string>
  /** the one claimed cell (per owner) that carries the owner's decoration, if any */
  decorationAt: ReadonlyMap<string, DecorationKind>
  /** unordered cell-pair keys with no wall between them (owner<->claim, or diagonal<->flank) */
  openEdges: ReadonlySet<string>
}

// Row-major scan order, plus a strength ranking for contested diagonals (see below), so
// two nearby claimable rooms never fight unpredictably over the same cell. Each owner
// independently claims whichever of its 8 immediate neighbors (sides + diagonals) are
// free — no flood-fill beyond that ring, so the shape stays a direct "3x3 minus whatever's
// occupied" instead of wandering off into open floor further away. A diagonal's flank can
// be either claimed void or the owner's own real corridor arm — either way the diagonal
// ends up visually flush with a wall the owner already has open, not floating by itself.
// eslint-disable-next-line react-refresh/only-export-components -- grid-derived data, exported for tileRegions.spec-style assertions; the claim rules belong beside the wall model, not in a second copy
export const buildRoomClaims = (grid: FloorGrid): RoomClaims => {
  const claimedBy = new Map<string, string>()
  const openEdges = new Set<string>()
  // Every claim of an owner's that a prop could stand on, in claim order: genuinely EMPTY cells only. A
  // claimed corridor (a gate's approach, absorbed into the junction's footprint) is a real passage the
  // player walks down, and a sarcophagus standing in it is something they walk straight through. A room
  // with no empty cell to spare simply holds no prop.
  const ownerPropCandidates = new Map<string, string[]>()
  const noteClaim = (cellKey: string, ownerKey: string) => {
    claimedBy.set(cellKey, ownerKey)
    const [r, c] = cellKey.split(",").map(Number)
    if (cellAt(grid, r, c).type !== "empty") return
    const candidates = ownerPropCandidates.get(ownerKey)
    if (candidates) candidates.push(cellKey)
    else ownerPropCandidates.set(ownerKey, [cellKey])
  }

  // Ortho claims commit immediately, row-major first-come — two owners contending for the
  // same orthogonal neighbor is rare enough not to warrant the ranking below. Diagonal
  // claims are only proposed here and resolved afterward (see below).
  type DiagonalCandidate = {
    ownerKey: string
    ownerRow: number
    ownerCol: number
    scanOrder: number
    attachedFlanks: ReadonlyArray<readonly [number, number]>
    realFlankCount: number
  }
  const diagonalCandidates = new Map<string, DiagonalCandidate[]>()
  let scanOrder = 0

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !canClaimVoid(grid, r, c, cell.roomType, cell.tags, cell.stairId, cell.dirs.size))
        continue
      const ownerKey = `${r},${c}`
      const claimedThisOwner = new Set<string>()
      for (const [dr, dc] of ORTHO_OFFSETS) {
        const nr = r + dr,
          nc = c + dc
        const key = `${nr},${nc}`
        if (claimedBy.has(key) || !isClaimableNeighbor(grid, r, c, nr, nc)) continue
        noteClaim(key, ownerKey)
        claimedThisOwner.add(key)
        openEdges.add(edgeKey(r, c, nr, nc))
      }
      for (const {
        offset: [dr, dc],
        flanks,
      } of DIAGONAL_OFFSETS) {
        const nr = r + dr,
          nc = c + dc
        const key = `${nr},${nc}`
        if (!isClaimableNeighbor(grid, r, c, nr, nc)) continue
        // A flank attached via the owner's own real graph edge is a durable structural
        // fact; one attached only because this same pass just claimed it as void is
        // incidental and shouldn't count as equally strong when ranking contested claims.
        let realFlankCount = 0
        const attachedFlanks = flanks.filter(([fr, fc]) => {
          if (cell.dirs.has(OFFSET_TO_DIR[`${fr},${fc}`])) {
            realFlankCount++
            return true
          }
          return claimedThisOwner.has(`${r + fr},${c + fc}`)
        })
        if (attachedFlanks.length === 0) continue
        const existing = diagonalCandidates.get(key) ?? []
        existing.push({ ownerKey, ownerRow: r, ownerCol: c, scanOrder: scanOrder++, attachedFlanks, realFlankCount })
        diagonalCandidates.set(key, existing)
      }
    }
  }

  // A room's *type* — unlike its progression state — never changes for the rest of the
  // session, so it makes a stable tiebreaker. A completed/reachable/visible rank was tried
  // here before and reintroduced the same bug one level up: two claimants tied on state
  // (e.g. both eventually "completed") fell back to scan order and flipped ownership all
  // over again the moment the player finished exploring. Forks are junctions, structurally
  // meant to absorb the void around them; leaf rooms (treasure/stairhead/exit) are
  // endpoints that happen to reach a shared diagonal too. Prefer the fork, permanently.
  const roomTypeRankOf = (row: number, col: number): number => {
    const owner = grid.cells[row]?.[col]
    return owner?.type === "room" && owner.roomType === "fork" ? 1 : 0
  }

  // Resolve each contested diagonal by attachment strength — a diagonal flush against
  // both its neighboring arms is a stronger, more established claim than one flush
  // against only one. Without this, revealing a hidden room can introduce a new,
  // weakly-attached claimant that — by pure scan order — steals a diagonal cell out from
  // under a room that was already flush against it on two sides, visibly moving a wall.
  for (const [key, candidates] of diagonalCandidates) {
    if (claimedBy.has(key)) continue // already an ortho claim, which always wins
    const winner = candidates.reduce((best, c) => {
      if (c.realFlankCount !== best.realFlankCount) return c.realFlankCount > best.realFlankCount ? c : best
      if (c.attachedFlanks.length !== best.attachedFlanks.length) {
        return c.attachedFlanks.length > best.attachedFlanks.length ? c : best
      }
      const cRank = roomTypeRankOf(c.ownerRow, c.ownerCol)
      const bestRank = roomTypeRankOf(best.ownerRow, best.ownerCol)
      if (cRank !== bestRank) return cRank > bestRank ? c : best
      return c.scanOrder < best.scanOrder ? c : best
    })
    noteClaim(key, winner.ownerKey)
    const [kr, kc] = key.split(",").map(Number)
    for (const [fr, fc] of winner.attachedFlanks) {
      const flankKey = `${winner.ownerRow + fr},${winner.ownerCol + fc}`
      openEdges.add(edgeKey(kr, kc, winner.ownerRow + fr, winner.ownerCol + fc))
      if (!claimedBy.has(flankKey)) noteClaim(flankKey, winner.ownerKey)
    }
  }

  // Decoration only ever lands on an empty claimed cell — the room's own space, never a passage
  // through it (see noteClaim).
  //
  // **A prop stands against a wall where it can.** Its sprite is a cell plus a face band tall, so it
  // leans a band's worth into the cell to its north; on a cell with void above, that headroom lands on
  // wall, which is where a statue belongs and where nothing can be behind it. On a cell with floor above
  // it, the statue leans over ground the player walks, and the explorer dot — drawn last — passes in
  // FRONT of its head. Half the props in the world stood that way before this preference.
  const wallBehind = (cellKey: string): boolean => {
    const [r, c] = cellKey.split(",").map(Number)
    return cellAt(grid, r - 1, c).type === "empty"
  }
  const decorationAt = new Map<string, DecorationKind>()
  for (const [ownerKey, candidates] of ownerPropCandidates) {
    const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
    const owner = grid.cells[ownerRow]?.[ownerCol]
    if (owner?.type !== "room" || !owner.decoration) continue
    decorationAt.set(candidates.find(wallBehind) ?? candidates[0], owner.decoration)
  }

  return { claimedBy, decorationAt, openEdges }
}

// The room a claimed cell renders as part of, if that room is lit — the claim borrows the owner's
// state, so a fogged owner takes its whole blob (void cells included) with it.
const litClaimOwner = (grid: FloorGrid, claims: RoomClaims, r: number, c: number): RoomCell | undefined => {
  const cell = cellAt(grid, r, c)
  if (cell.type !== "empty" && cell.type !== "corridor") return undefined
  const ownerKey = claims.claimedBy.get(`${r},${c}`)
  if (!ownerKey) return undefined
  const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
  const owner = grid.cells[ownerRow]?.[ownerCol]
  return owner?.type === "room" && owner.state !== "fogged" ? owner : undefined
}

// True if the void/corridor cell at `key` was claimed by a junction (fork) room — the other end of
// a fork-to-fork merge (see isPassable below).
const claimedByFork = (grid: FloorGrid, claims: RoomClaims, key: string): boolean => {
  const ownerKey = claims.claimedBy.get(key)
  if (!ownerKey) return false
  const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
  const owner = grid.cells[ownerRow]?.[ownerCol]
  return owner?.type === "room" && owner.roomType === "fork"
}

// Whether the player can pass between two cells the map draws floor for. Adjacency is NOT passage:
// a room claims the cells around it as footprint, so its floor can sit flush against a corridor it
// has no way through to, and that boundary needs a partition (see tileRegions.ts) or the room reads
// as something to walk around.
const isPassable = (grid: FloorGrid, claims: RoomClaims, r: number, c: number, dir: "s" | "e"): boolean => {
  const cell = cellAt(grid, r, c)
  const [dr, dc] = DIR_MOVES[dir]
  const nr = r + dr
  const nc = c + dc
  const neighbor = cellAt(grid, nr, nc)
  // A real graph edge, from either side.
  if ((cell.type === "room" || cell.type === "corridor") && cell.dirs.has(dir)) return true
  if ((neighbor.type === "room" || neighbor.type === "corridor") && neighbor.dirs.has(OPPOSITE_DIR[dir])) return true
  if (claims.openEdges.has(edgeKey(r, c, nr, nc))) return true
  // Two junction rooms that each claim their own side of a shared void/corridor cell
  // (buildRoomClaims assigns that cell to whichever claims first) should still read as one open
  // space — junctions are connective tissue, not a distinct place, unlike other room types, which
  // stay visually separate even sitting right next to someone else's claim.
  const isForkMeetingClaim = (a: GridCell, bKey: string): boolean =>
    a.type === "room" && a.roomType === "fork" && claimedByFork(grid, claims, bKey)
  if (isForkMeetingClaim(cell, `${nr},${nc}`)) return true
  if (isForkMeetingClaim(neighbor, `${r},${c}`)) return true
  // Cells of one room's own footprint are one space: the claim is the room.
  const ownerOf = (row: number, col: number): string | undefined =>
    claims.claimedBy.get(`${row},${col}`) ?? (cellAt(grid, row, col).type === "room" ? `${row},${col}` : undefined)
  const own = ownerOf(r, c)
  return !!own && own === ownerOf(nr, nc)
}

// **A wall is a cell, not an edge.** Whether two neighbouring drawn cells read as one open space is
// no longer a question the renderer asks: they are both floor, and the wall is whatever cell the map
// draws no floor for (see tileRegions.ts). Two junctions each claiming their side of the void
// between them therefore merge for free, and two rooms flanking unclaimed void keep the wall
// between them for free.
const cellFloorAt = (
  grid: FloorGrid,
  claims: RoomClaims,
  ownedKeys: ReadonlySet<string> | undefined,
  r: number,
  c: number
): ReturnType<FloorAt> => {
  // The stone a cell is built of is its own SECTION's tier, not its floor's: a pocket gated behind a
  // junior key is junior stone inside a starter pyramid, and walking through the gate should say so.
  const floorTierOf = grid.difficulty ?? "starter"
  const owner = litClaimOwner(grid, claims, r, c)
  // A claimed cell renders as part of its owner: same material, same state, one continuous chamber.
  if (owner) return { state: owner.state, kind: "room", tier: owner.difficulty ?? floorTierOf }
  const cell = cellAt(grid, r, c)
  if (cell.type === "empty") return "stone"
  // A real passage still in the dark is not stone — see FloorAt.
  if (cell.state === "fogged") return "unlit"
  const kind = cell.type === "room" ? "room" : "corridor"
  const tier = cell.difficulty ?? floorTierOf
  // A locked gate reads as not-yet-yours: cosmetic only, exactly as its icon does below.
  if (cell.type === "room" && cell.state === "reachable" && isLockedGate(cell, ownedKeys)) {
    return { state: "visible", kind, tier }
  }
  return { state: cell.state, kind, tier }
}

/** Which cells the map paints as floor and which as wall. Exported for tests: it is where the claim
 * rules above meet the wall model, and asserting on cells beats sniffing rendered SVG. */
// eslint-disable-next-line react-refresh/only-export-components -- pure function over the grid, exported so tests can assert on cells instead of sniffing rendered SVG
export const tileRegionsFor = (grid: FloorGrid, claims: RoomClaims, ownedKeys?: ReadonlySet<string>): TileRegions =>
  buildTileRegions(
    grid.rows,
    grid.cols,
    (r, c) => cellFloorAt(grid, claims, ownedKeys, r, c),
    (r, c, dir) => isPassable(grid, claims, r, c, dir),
    grid.difficulty ?? "starter"
  )

// A corridor is a "corner" (and thus a valid click target for corner-reveal/hidden-
// passage interaction) whenever it isn't a plain straight-through segment.
const isCorridorCorner = (dirs: ReadonlySet<Direction>): boolean =>
  dirs.size !== 2 || !((dirs.has("n") && dirs.has("s")) || (dirs.has("e") && dirs.has("w")))

const OPPOSITE_DIR: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

// A straight run of "visible" corridor only ever has one real click target: the corner
// (or room) that ends it, which can be many cells — and screens — away. Walking that far
// out means the on-screen entrance to the run has nothing to tap. This walks a run
// forward from its near end (right next to the explorer) to find that far target, so the
// caller can render the click affordance where the player already is instead.
const findCorridorRunTarget = (
  grid: FloorGrid,
  startR: number,
  startC: number,
  incomingDir: Direction
): readonly [number, number] | null => {
  let r = startR,
    c = startC,
    fromDir = incomingDir
  for (let steps = 0; steps < grid.rows * grid.cols; steps++) {
    const cell = cellAt(grid, r, c)
    if (cell.type === "empty") return null
    if (cell.type === "room") {
      return cell.state === "reachable" || cell.state === "completed" ? [r, c] : null
    }
    if (isCorridorCorner(cell.dirs)) {
      return cell.state === "reachable" || cell.state === "completed" ? [r, c] : null
    }
    if (cell.state !== "visible" && cell.state !== "reachable" && cell.state !== "completed") return null
    const nextDir = ([...cell.dirs] as Direction[]).find(d => d !== OPPOSITE_DIR[fromDir])
    if (!nextDir) return null
    const [dr, dc] = DIR_MOVES[nextDir]
    r += dr
    c += dc
    fromDir = nextDir
  }
  return null
}

type CorridorRunTarget = { row: number; col: number; dir: Direction }

const EMPTY_RUN_TARGETS: ReadonlyMap<string, CorridorRunTarget> = new Map()

// For each direction open from the explorer's current cell, find the corridor run's far
// click target (if any) and key it by the NEAR cell — the first step of that run — so
// rendering can put the click affordance right next to the player. `dir` is that first
// step's direction, unambiguous by construction, so the marker can point the way there.
const useCorridorRunTargets = (
  grid: FloorGrid,
  explorerPos: readonly [number, number] | undefined
): ReadonlyMap<string, CorridorRunTarget> =>
  useMemo(() => {
    const targets = new Map<string, CorridorRunTarget>()
    if (!explorerPos) return targets
    const [er, ec] = explorerPos
    const startCell = cellAt(grid, er, ec)
    if (startCell.type !== "room" && startCell.type !== "corridor") return targets
    for (const dir of startCell.dirs) {
      const [dr, dc] = DIR_MOVES[dir]
      const nearR = er + dr,
        nearC = ec + dc
      const target = findCorridorRunTarget(grid, nearR, nearC, dir)
      if (target && (target[0] !== nearR || target[1] !== nearC)) {
        targets.set(`${nearR},${nearC}`, { row: target[0], col: target[1], dir })
      }
    }
    return targets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, explorerPos?.[0], explorerPos?.[1]])

// ─── Tile layers ────────────────────────────────────────────────────────────────
// Floors and walls are painted as a handful of pattern-filled paths under the whole map rather
// than a rect per cell — see tileRegions.ts for the model and
// docs/game-design/spritesheet-renderer-prep.md for why.

const FACE_SHADOW = CELL / 8
// How much of a wall's TOP surface shows above its face. A wall has thickness, and the side walls already
// show theirs edge-on; without this a face is a flat band of brick with nothing above it.
const FACE_TOP = SIDE_W / 2

// The floor's material follows the FLOOR's own tier, carried on the grid — not the rooms'. A
// starter pyramid's ward-chest teaser is authored at a LATER tier on purpose (spec/starter.ts), so
// room difficulties are the wrong thing to infer a floor's material from: a starter cellar came out
// built of a pharaoh's granite. Per-room difficulty still dresses the room (props, light).
const floorTier = (grid: FloorGrid): Difficulty => grid.difficulty ?? "starter"

const TileLayers = ({
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
  const allFloor = rectsToPath(
    [...regions.values()].flatMap(groups => [
      ...Object.values(groups.floorRoom).flat(),
      ...Object.values(groups.floorCorridor).flat(),
    ])
  )
  const tiers = [...regions.keys()]

  return (
    <>
      <defs>
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
                const shadows = faceShadowsToPath(groups.wallFace[state], FACE_SHADOW)
                const tops = faceTopsToPath(groups.wallFace[state], FACE_TOP)
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

// ─── Decorations ────────────────────────────────────────────────────────────────
// A prop is drawn in the room's first genuine claim (void or diagonal — never a flank corridor,
// see buildRoomClaims above): the tier's sprite when it has one, and the placeholder glyph when it
// does not, so art can land one piece at a time.

// A prop sprite is a cell PLUS a face band tall, anchored by its BOTTOM edge on the cell's floor line.
// Bottom-anchored is what makes it stand on the floor instead of floating over it; the band of headroom
// is what lets it have height. Props are painted after every wall (see the render order below), so a
// statue occludes the wall behind it rather than being cut off at its own cell — and a room's prop cell
// is the first claim in row-major order, normally the cell NORTH of the room, so the headroom reaches
// into wall rather than over the room's own icon.
const PROP_H = CELL + WALL_H

const Decoration = ({ kind, tier }: { kind: DecorationKind; tier: Difficulty }) => {
  const url = tileUrl(tier, kind)
  return url ? (
    <image href={url} x={-CELL / 2} y={CELL / 2 - PROP_H} width={CELL} height={PROP_H} />
  ) : (
    <DecorationGlyph kind={kind} />
  )
}

const DECORATION_COLOR = "#5a4a30"

const DecorationGlyph = ({ kind }: { kind: DecorationKind }) => {
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
    case "rubble":
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

const WallItems = ({ items }: { items: readonly WallItem[] }) => (
  <g>
    {items.map(({ row, col, kind, tier, state }) => {
      const url = tileUrl(tier, kind)
      const x = cellLeft(col)
      const y = cellTop(row) - WALL_H
      const wash = stateWash[state]
      return (
        <Fragment key={`${row},${col}`}>
          {url ? (
            // The band's shape, not a square: a wall item is painted on the face.
            <image href={url} x={x} y={y} width={CELL} height={WALL_H} preserveAspectRatio="none" />
          ) : (
            <rect
              x={x + CELL / 2 - 6}
              y={y + WALL_H / 2 - 5}
              width={12}
              height={10}
              fill="none"
              stroke={DECORATION_COLOR}
              strokeWidth={1.5}
            />
          )}
          {wash && <rect x={x} y={y} width={CELL} height={WALL_H} fill={wash.fill} opacity={wash.opacity} />}
        </Fragment>
      )
    })}
  </g>
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

const ARCH_FADE = 0.35

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
  <g>
    {doorways.map(({ row, col, tier }) => {
      const url = tileUrl(tier, "arch")
      if (!url) return null
      // Faded while the player is IN the doorway — standing on either of the two cells it spans. Only
      // those two are ever behind it, so nothing else on the map dims.
      const under = !!explorerPos && explorerPos[1] === col && (explorerPos[0] === row || explorerPos[0] === row - 1)
      return (
        <image
          key={`${row},${col}`}
          href={url}
          // Wider than the cell by a corner on each side: the jambs stand IN those corners — the wall's
          // own thickness — rather than inside the opening, so the way through stays a full cell wide and
          // the arch reads as built into the wall run instead of set into the hole.
          x={cellLeft(col) - SIDE_W}
          // The band, plus the crown standing proud of the wall above it and the jambs reaching down onto
          // the floor of the way through below it.
          y={cellTop(row) - WALL_H - ARCH_RISE}
          width={ARCH_W}
          height={ARCH_H}
          opacity={under ? ARCH_FADE : 1}
          preserveAspectRatio="none"
        />
      )
    })}
  </g>
)

// ─── Torchlight on the place the player is standing ─────────────────────────────

/**
 * The room or corridor cell the explorer is in, washed warm — the same torch that pools at their feet
 * reaching the walls around them.
 *
 * A CHAMBER lights whole: a torch carried into a small room lights the room, and lighting one cell of it
 * would draw a square of light on a floor with no edge to justify it. A corridor lights only the cell
 * stood in, because a corridor has no extent to fill.
 *
 * Screen-blended and weak on purpose. This sits under the player for the whole game, so it has to read as
 * the stone being lit rather than as a coloured overlay on top of it — and it must never compete with the
 * state washes that tell the player what is explored.
 */
// Weak, flat across the place, and it stops AT the place — no bleed onto what happens to sit next to it.
// Spilling onto neighbours used grid adjacency rather than connectivity, so a corridor with a wall between
// it and the room lit up anyway; and the map already tells the player what is reachable.
// The pool at the explorer's feet already does the close light;
// this only has to say which room they are in, so a strong wash under the player was the same light drawn
// twice and read as a bright tile rather than a lit room. It still has to clear an UNVISITED room, since
// `completed` washes a visited one 20% darker and standing somewhere must not be dimmer than never having
// been there — on starter stone that puts the place at 102 against an unvisited 96 and a visited 77.
/**
 * The PLACE the explorer is standing in — a whole chamber, or the stretch of corridor they are on.
 *
 * A place, never a tile. A torch carried into a room lights the room; carried along a passage it lights
 * the passage as far as the next turn. Lighting the single cell drew a bright square on a floor with no
 * edge to justify it, which read as a tile rather than as somewhere being lit.
 *
 * The room case has to handle standing on the room's OWN cell as well as on one it claims: `claimedBy`
 * maps a claimed cell to its owner and has no entry for the owner itself, so looking up the owner and
 * stopping there lit one square whenever the player stood in the middle of their own chamber.
 */
const litPlaceCells = (grid: FloorGrid, claims: RoomClaims, at: readonly [number, number]): string[] => {
  const here = `${at[0]},${at[1]}`
  const owner = claims.claimedBy.get(here) ?? here
  const footprint = [owner, ...[...claims.claimedBy.entries()].filter(([, o]) => o === owner).map(([cell]) => cell)]
  if (footprint.length > 1) return footprint

  const cell = cellAt(grid, at[0], at[1])
  if (cell.type !== "corridor") return [here]

  // The run: out from the cell in every open direction, following the passage until it turns or opens
  // into something else. The turn itself is included — a light that stopped one cell short of the corner
  // would leave the corner darker than the straight, which is the opposite of how a corner reads.
  const cells = [here]
  for (const dir of cell.dirs) {
    let [dr, dc] = DIR_MOVES[dir]
    let r = at[0] + dr
    let c = at[1] + dc
    let from: Direction = dir
    for (let steps = 0; steps < grid.rows + grid.cols; steps++) {
      const next = cellAt(grid, r, c)
      if (next.type !== "corridor" || next.state === "fogged") break
      cells.push(`${r},${c}`)
      if (isCorridorCorner(next.dirs)) break
      const onward = ([...next.dirs] as Direction[]).find(d => d !== OPPOSITE_DIR[from])
      if (!onward) break
      ;[dr, dc] = DIR_MOVES[onward]
      r += dr
      c += dc
      from = onward
    }
  }
  return cells
}

const TORCH_LIT = "#ffe2b0"

const LitPlace = ({
  grid,
  claims,
  at,
  className,
}: {
  grid: FloorGrid
  claims: RoomClaims
  at?: readonly [number, number]
  className: string
}) => {
  const place = at ? litPlaceCells(grid, claims, at) : []

  const lit = new Set(place)

  // A cell's square PLUS the gap to any lit neighbour. The map's pitch is a cell plus a wall band, so two
  // cells of a corridor sit 28 units apart with floor between them — squares alone left that band dark and
  // the run read as a row of lit tiles rather than as a lit passage. The floor layers fill those gaps for
  // the same reason; light has to as well.
  const pathFor = (keys: Iterable<string>, joinsTo: ReadonlySet<string>) =>
    [...keys]
      .flatMap(key => {
        const [r, c] = key.split(",").map(Number)
        const parts = [`M${cellLeft(c)} ${cellTop(r)}h${CELL}v${CELL}h${-CELL}z`]
        if (joinsTo.has(`${r - 1},${c}`))
          parts.push(`M${cellLeft(c)} ${cellTop(r) - WALL_H}h${CELL}v${WALL_H}h${-CELL}z`)
        if (joinsTo.has(`${r},${c - 1}`))
          parts.push(`M${cellLeft(c) - SIDE_W} ${cellTop(r)}h${SIDE_W}v${CELL}h${-SIDE_W}z`)
        // And the little square where four lit cells meet — the corner between a north gap and a west
        // gap. Filling both bands and not the corner between them leaves an unlit dot at every crossing
        // inside a room, which is the artefact a floor of squares always has if you stop at the edges.
        if (joinsTo.has(`${r - 1},${c}`) && joinsTo.has(`${r},${c - 1}`) && joinsTo.has(`${r - 1},${c - 1}`))
          parts.push(`M${cellLeft(c) - SIDE_W} ${cellTop(r) - WALL_H}h${SIDE_W}v${WALL_H}h${-SIDE_W}z`)
        return parts
      })
      .join("")

  if (!lit.size) return null
  return <path data-torch="lit" className={className} d={pathFor(lit, lit)} fill={TORCH_LIT} />
}

const FADE_MS = 320
const FADE_IN = "map-lit-in"
const FADE_OUT = "map-lit-out"
const LIT_OPACITY = 0.1
const LIT_CSS = `
.${FADE_IN} { animation: map-lit-in ${FADE_MS}ms ease-out both; }
.${FADE_OUT} { animation: map-lit-out ${FADE_MS}ms ease-in both; }
@keyframes map-lit-in { from { opacity: 0 } to { opacity: ${LIT_OPACITY} } }
@keyframes map-lit-out { from { opacity: ${LIT_OPACITY} } to { opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .${FADE_IN} { animation: none; opacity: ${LIT_OPACITY} }
  .${FADE_OUT} { animation: none; opacity: 0 }
}
`

/**
 * The lit place, crossfaded as the explorer walks from one to the next.
 *
 * Tied to the LIVE position rather than the settled one, so the room ahead comes up over the walk instead
 * of snapping on at the moment of arrival. Both places are drawn during the crossing — the old one going
 * out, the new one coming in — because a path cannot tween between two shapes, so the fade has to be
 * between two of them.
 */
const LitPlaces = ({ grid, claims, at }: { grid: FloorGrid; claims: RoomClaims; at?: readonly [number, number] }) => {
  const key = at ? litPlaceCells(grid, claims, at).join("|") : ""
  const [leaving, setLeaving] = useState<readonly [number, number] | undefined>(undefined)
  const prevRef = useRef<{ key: string; at?: readonly [number, number] }>({ key, at })

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = { key, at }
    if (prev.key === key || !prev.at) return
    setLeaving(prev.at)
    const timer = setTimeout(() => setLeaving(undefined), FADE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the PLACE, which is what `key` is
  }, [key])

  return (
    <g style={{ mixBlendMode: "screen" }} pointerEvents="none">
      <style>{LIT_CSS}</style>
      {leaving && <LitPlace key="leaving" grid={grid} claims={claims} at={leaving} className={FADE_OUT} />}
      <LitPlace key={key} grid={grid} claims={claims} at={at} className={FADE_IN} />
    </g>
  )
}

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

const ReachableDot = () => (
  <>
    <TapTarget />
    <circle r={MARKER_RADIUS} fill={MARKER_FILL} stroke={MARKER_OUTLINE} strokeWidth={2} />
  </>
)

/** Invisible, and the reason a marker can be small and still easy to hit. `fill="transparent"` rather than
 * `none`: a shape with no fill is not there as far as pointer events are concerned. */
const TapTarget = () => <circle r={MARKER_HIT} fill="transparent" />

const RunTargetArrow = ({ dir }: { dir: Direction }) => {
  const r = MARKER_RADIUS * 1.2
  return (
    <>
      <TapTarget />
      <polygon
        points={`0,${-r} ${r},${r} ${-r},${r}`}
        fill={MARKER_FILL}
        stroke={MARKER_OUTLINE}
        strokeWidth={2}
        strokeLinejoin="round"
        transform={`rotate(${DIR_ROTATION[dir]})`}
      />
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteMapView = ({
  grid: gridProp,
  onCellClick,
  revealAllCells = false,
  explorerPos,
  currentFloor,
  pendingCells,
  ownedKeys,
  className,
}: Props) => {
  const grid = revealAllCells ? revealAll(gridProp) : gridProp
  const claims = useMemo(() => buildRoomClaims(grid), [grid])
  const tier = useMemo(() => floorTier(grid), [grid])
  // Where the player can actually walk to. A corner is marked "reachable" when it is revealed, from
  // wherever the player stood THEN; whether a route still exists from where they stand NOW is a
  // different question, and it is the one a marker has to answer — an unreachable marker is a tap
  // that does nothing, where a plain dead end would have told the truth.
  const walkable = useMemo(
    () => (explorerPos ? walkableFrom(grid, explorerPos) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, explorerPos?.[0], explorerPos?.[1]]
  )
  const canWalkTo = (row: number, col: number) => !walkable || walkable.has(`${row},${col}`)
  const regions = useMemo(() => tileRegionsFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  const wallItems = useMemo(() => wallItemsFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  const doorways = useMemo(() => doorwaysFor(grid, claims, ownedKeys), [grid, claims, ownedKeys])
  // Where the arches are, in the same terms the wall bands are built in, with the stone each one is cut
  // from — the sill in that gap is drawn to match it (see TileLayers.archedGaps).
  // The air on this floor: its rank's, with whatever hour it authors (moodSettings.ts).
  const mood = useMemo(() => moodFor(tier, grid.theme), [tier, grid.theme])
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
  const archedGaps = useMemo(
    () =>
      new Map(doorways.map(({ row, col, tier: archTier }) => [`${cellLeft(col)},${cellTop(row) - WALL_H}`, archTier])),
    [doorways]
  )
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
  const settledCorridorRunTargets = useCorridorRunTargets(grid, settledExplorerPos)
  const corridorRunTargets = isTraveling ? EMPTY_RUN_TARGETS : settledCorridorRunTargets

  // Must be >= CELL: a fork/endpoint on the map's edge can claim one cell of "outside
  // the grid" void (see cellAt above), and that extra ring needs to physically fit
  // within the padding margin without clipping.
  const svgWidth = mapWidth(grid.cols)
  const svgHeight = mapHeight(grid.rows)

  const { scrollRef, sizerRef, mapRef, zoomRef, scrollHandlers } = useMapZoom(svgWidth, svgHeight)

  useEffect(() => {
    if (!explorerPos || !scrollRef.current || !sizerRef.current) return
    const el = scrollRef.current
    const elRect = el.getBoundingClientRect()
    const mapRect = sizerRef.current.getBoundingClientRect()
    // Origin accounts for the map's own offset within the scroll area (e.g. safe-area padding, centering margin)
    const originX = mapRect.left - elRect.left + el.scrollLeft
    const originY = mapRect.top - elRect.top + el.scrollTop
    // Cell coordinates are in unzoomed SVG units; the rendered map is `zoom` times that size.
    const zoom = zoomRef.current
    const { cx, cy } = cellCenter(explorerPos[0], explorerPos[1])
    const x = originX + cx * zoom
    const y = originY + cy * zoom
    el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPos?.[0], explorerPos?.[1]])

  return (
    <div
      ref={scrollRef}
      {...scrollHandlers}
      className={`flex overflow-auto pt-safe-top pr-safe-right pb-safe-bottom pl-safe-left${className ? ` ${className}` : ""}`}
    >
      {/* Sizer: carries the zoomed footprint so the scroll extents are real, while the map itself
          scales by transform — see useMapZoom. Its size is written there, never by React. */}
      <div ref={sizerRef} className="m-auto shrink-0">
        <svg
          ref={mapRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label="site map"
          className="block"
          // The ground IS stone: a pyramid is carved out of rock, so everything the map has not lit
          // is the tier's own dark stone rather than a void. Two things fall out of that — the shape of
          // the drawn stone can no longer trace passages the player has not walked, and a pocket
          // enclosed by a thick wall stops reading as a hole punched through it.
          //
          // Pixel art: no smoothing, so a tile stays crisp instead of turning to mush as the map
          // scales. Crisp at every zoom needs useMapZoom to snap to whole steps — not done yet.
          style={{ background: tierPalette[tier].wallBase, imageRendering: ART_IMAGE_RENDERING }}
        >
          <TileLayers regions={regions} tier={tier} archedGaps={archedGaps} />
          <LitPlaces grid={grid} claims={claims} at={explorerPos} />
          <MapLife
            mood={mood}
            siteId={grid.siteId}
            floorCells={floorCells}
            isLit={(r, c) => {
              const cell = cellAt(grid, r, c)
              return cell.type !== "empty" && cell.state !== "fogged"
            }}
          />
          <WallItems items={wallItems} />

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
                const decoration = claims.decorationAt.get(cellKey)
                const isCorner = cell.type === "corridor" && isCorridorCorner(cell.dirs)
                const runTarget = cell.type === "corridor" ? corridorRunTargets.get(cellKey) : undefined
                const clickTarget = runTarget ? [runTarget.row, runTarget.col] : [r, c]
                const corridorClickable =
                  cell.type === "corridor" &&
                  onCellClick &&
                  canWalkTo(clickTarget[0], clickTarget[1]) &&
                  ((cell.state === "reachable" || cell.state === "completed") && isCorner ? true : !!runTarget)
                return (
                  <g
                    key={cellKey}
                    transform={`translate(${cx}, ${cy})`}
                    onClick={corridorClickable ? () => onCellClick(clickTarget[0], clickTarget[1]) : undefined}
                    style={{ cursor: corridorClickable ? "pointer" : "default" }}
                  >
                    {cell.type === "corridor" &&
                      canWalkTo(clickTarget[0], clickTarget[1]) &&
                      (runTarget ? (
                        <RunTargetArrow dir={runTarget.dir} />
                      ) : (
                        cell.state === "reachable" && isCorner && <ReachableDot />
                      ))}
                    {decoration && <Decoration kind={decoration} tier={claimOwner.difficulty ?? tier} />}
                  </g>
                )
              }

              if (cell.type === "empty") return null
              if (cell.state === "fogged") return null

              if (cell.type === "corridor") {
                const isCorner = isCorridorCorner(cell.dirs)
                const runTarget = corridorRunTargets.get(cellKey)
                // A visible run's near end has no corner of its own to click — it borrows the
                // far corner's click target (see findCorridorRunTarget) so a long corridor
                // that scrolls off screen still has something to tap right next to the player.
                const clickTarget = runTarget ? [runTarget.row, runTarget.col] : [r, c]
                const corridorClickable =
                  onCellClick &&
                  canWalkTo(clickTarget[0], clickTarget[1]) &&
                  (((cell.state === "reachable" || cell.state === "completed") && isCorner) || !!runTarget)
                return (
                  <g
                    key={`${r},${c}`}
                    transform={`translate(${cx}, ${cy})`}
                    onClick={corridorClickable ? () => onCellClick(clickTarget[0], clickTarget[1]) : undefined}
                    style={{ cursor: corridorClickable ? "pointer" : "default" }}
                  >
                    {canWalkTo(clickTarget[0], clickTarget[1]) &&
                      (runTarget ? (
                        <RunTargetArrow dir={runTarget.dir} />
                      ) : (
                        cell.state === "reachable" && isCorner && <ReachableDot />
                      ))}
                  </g>
                )
              }

              // room cell
              const state = cell.state
              const isCompleted = state === "completed"
              // Only ever a pending-loot marker for a treasure room with a consumable reward — this
              // guards against stale coordinates in pendingCells (e.g. left over from before a site
              // was regenerated) painting the badge onto whatever room now occupies that cell.
              const shapeKind = shapeKindFor(grid, r, c, cell.roomType, cell.tags, cell.stairId)
              // Portals (entrance/stairhead/exit) are transitions, not tasks — they can't be
              // "completed", so they never get the completed dim or the ✓ badge even though the
              // entrance is always marked explored (useAssembledFloor) and used staircases complete.
              const isPortal = shapeKind === "entrance" || shapeKind === "stairhead" || shapeKind === "exit"
              const isPending =
                isCompleted &&
                shapeKind === "treasure" &&
                cell.reward?.type === "consumable" &&
                (pendingCells?.has(`${r},${c}`) ?? false)
              const clickable = onCellClick && (state === "reachable" || state === "completed") && canWalkTo(r, c)
              const roomR = nodeRadius[shapeKind]
              const locked = isLockedGate(cell, ownedKeys)
              const displayState: CellState = locked && state === "reachable" ? "visible" : state

              return (
                <g
                  key={`${r},${c}`}
                  transform={`translate(${cx}, ${cy})`}
                  onClick={clickable ? () => onCellClick(r, c) : undefined}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                >
                  <g opacity={isCompleted && !isPending && !isPortal ? 0.45 : 1}>
                    <NodeShape
                      type={shapeKind}
                      state={displayState}
                      gateVariant={cell.gateVariant}
                      keyColor={cell.keyColor}
                      keyColors={cell.keyColors}
                      difficulty={wardKeyDifficulty(cell.requiredKeyId)}
                    />
                  </g>
                  {isCompleted &&
                    !isPortal &&
                    shapeKind !== "fork" &&
                    (isPending ? <PendingLootBadge r={roomR} /> : <CompletedBadge r={roomR} />)}
                </g>
              )
            })
          })}

          {explorerPos && (
            <ExplorerDot
              key={currentFloor}
              grid={grid}
              pos={explorerPos}
              onArrive={() => setSettledExplorerPos(explorerPos)}
            />
          )}

          {/* Last, so a doorway passes in FRONT of the player walking under it — see Archways. */}
          <Archways doorways={doorways} explorerPos={explorerPos} />

          {/* The air, over the stone and over the player: what is carried on it, and what hour it is. */}
          <MapWeather mood={mood} siteId={grid.siteId} width={svgWidth} height={svgHeight} />
        </svg>
      </div>
    </div>
  )
}
