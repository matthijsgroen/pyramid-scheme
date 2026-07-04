import { useEffect, useMemo, useRef, useState } from "react"
import type {
  CellState,
  DecorationKind,
  Direction,
  FloorGrid,
  GateVariant,
  GridCell,
  KeyColor,
  RoomType,
} from "../../game/siteTypes"
import { revealAll } from "../../game/gridNavigation"
import { ExplorerDot } from "./ExplorerDot"

// Cells one step outside the grid are still real void for claiming purposes — a fork or
// endpoint sitting on the map's edge shouldn't look artificially clipped next to one
// that happens to have interior void around it. Anything beyond the grid is `empty`.
const cellAt = (grid: FloorGrid, r: number, c: number): GridCell => grid.cells[r]?.[c] ?? { type: "empty" }

type Props = {
  grid: FloorGrid
  onCellClick?: (row: number, col: number) => void
  revealAllCells?: boolean
  explorerPos?: readonly [number, number]
  /** "row,col" keys of completed treasure cells with a reward still waiting to be picked up */
  pendingCells?: ReadonlySet<string>
  className?: string
}

const CELL = 44

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
  const r = 15
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

type ShapeProps = { state: CellState; gateVariant?: GateVariant; keyColor?: KeyColor; keyColors?: KeyColor[] }

const KEY_COLOR_HEX: Record<KeyColor, { visible: string; reachable: string }> = {
  blue: { visible: "#2060c0", reachable: "#4090e0" },
  red: { visible: "#c04020", reachable: "#e06040" },
  green: { visible: "#208040", reachable: "#30b060" },
  yellow: { visible: "#b09010", reachable: "#d0c030" },
  purple: { visible: "#7030b0", reachable: "#9050d0" },
}

const PuzzleShape = ({ state }: ShapeProps) => {
  const r = 16
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
  const r = 16
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
  const r = 7
  const stroke = state === "fogged" ? "#2e2018" : "#5a4a30"
  return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill="#1e160e" stroke={stroke} strokeWidth={1.5} />
}

const GateNodeShape = ({ state, gateVariant, keyColor }: ShapeProps) => {
  const r = 15
  const isTomb = gateVariant === "tomb-key"
  const colorKey = state === "visible" ? "visible" : "reachable"
  const fill = isTomb ? tombGateFill[state] : gateFill[state]
  const stroke =
    state === "fogged"
      ? isTomb
        ? tombGateStroke[state]
        : gateStroke[state]
      : isTomb
        ? tombGateStroke[state]
        : keyColor
          ? KEY_COLOR_HEX[keyColor][colorKey]
          : gateStroke[state]
  const barColor =
    state === "fogged"
      ? "#3a2a10"
      : isTomb
        ? colorKey === "visible"
          ? "#8040c0"
          : "#9060e0"
        : keyColor
          ? KEY_COLOR_HEX[keyColor][colorKey]
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
          fill={KEY_COLOR_HEX[keyColor][colorKey]}
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
  const r = 15
  const colorKey = state === "visible" ? "visible" : "reachable"
  const badges = keyColors && keyColors.length > 0 ? keyColors : keyColor ? [keyColor] : []
  const primaryColor = badges[0]
  const fill = treasureFill[state]
  const stroke = state !== "fogged" && primaryColor ? KEY_COLOR_HEX[primaryColor][colorKey] : treasureStroke[state]
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
          fill={KEY_COLOR_HEX[primaryColor][colorKey]}
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
            fill={KEY_COLOR_HEX[color][colorKey]}
          />
        ))}
    </>
  )
}

const StairheadShape = ({ state }: ShapeProps) => {
  const r = 15
  const cut = 5
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
  const r = 15
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

const nodeRadius: Record<RoomType, number> = {
  entrance: 15,
  puzzle: 16,
  trap: 16,
  fork: 7,
  gate: 15,
  treasure: 15,
  stairhead: 15,
  exit: 15,
}

const NodeShape = ({ type, state, gateVariant, keyColor, keyColors }: ShapeProps & { type: RoomType }) => {
  const p = { state, gateVariant, keyColor, keyColors }
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

const ALL_DIRS: readonly Direction[] = ["n", "s", "e", "w"]
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
const canClaimVoid = (roomType: RoomType, dirsSize: number): boolean =>
  roomType === "fork" ||
  ((roomType === "treasure" || roomType === "stairhead" || roomType === "exit") && dirsSize === 1)

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
  const leadsToGate = beyond?.type === "room" && beyond.roomType === "gate"
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
const buildRoomClaims = (grid: FloorGrid): RoomClaims => {
  const claimedBy = new Map<string, string>()
  const openEdges = new Set<string>()
  const ownerFirstClaim = new Map<string, string>()
  const noteClaim = (cellKey: string, ownerKey: string) => {
    claimedBy.set(cellKey, ownerKey)
    if (!ownerFirstClaim.has(ownerKey)) ownerFirstClaim.set(ownerKey, cellKey)
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
      if (cell.type !== "room" || !canClaimVoid(cell.roomType, cell.dirs.size)) continue
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

  // Decoration only ever lands on a genuine claim (void or diagonal), on whichever one
  // was committed first for its owner — never on a flank corridor that's just re-tinted.
  const decorationAt = new Map<string, DecorationKind>()
  for (const [ownerKey, cellKey] of ownerFirstClaim) {
    const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
    const owner = grid.cells[ownerRow]?.[ownerCol]
    if (owner?.type === "room" && owner.decoration) decorationAt.set(cellKey, owner.decoration)
  }

  return { claimedBy, decorationAt, openEdges }
}

// True if the void/corridor cell at `key` was claimed by a junction (fork) room — the
// other end of a fork-to-fork merge (see isOpenSide below).
const claimedByFork = (grid: FloorGrid, claims: RoomClaims, key: string): boolean => {
  const ownerKey = claims.claimedBy.get(key)
  if (!ownerKey) return false
  const [ownerRow, ownerCol] = ownerKey.split(",").map(Number)
  const owner = grid.cells[ownerRow]?.[ownerCol]
  return owner?.type === "room" && owner.roomType === "fork"
}

const isOpenSide = (grid: FloorGrid, claims: RoomClaims, r: number, c: number, dir: Direction): boolean => {
  const cell = cellAt(grid, r, c)
  const [dr, dc] = DIR_MOVES[dir]
  const nr = r + dr,
    nc = c + dc
  const neighbor = cellAt(grid, nr, nc)
  // a real graph edge is always open
  if ((cell.type === "room" || cell.type === "corridor") && cell.dirs.has(dir)) return true
  if (claims.openEdges.has(edgeKey(r, c, nr, nc))) return true
  // Two junction rooms that each claim their own side of a shared void/corridor cell
  // (buildRoomClaims assigns that cell to whichever claims first) should still read as one
  // open space — junctions are connective tissue, not a distinct place, unlike other room
  // types, which stay visually separate even sitting right next to someone else's claim.
  const isForkMeetingClaim = (a: GridCell, bKey: string): boolean =>
    a.type === "room" && a.roomType === "fork" && claimedByFork(grid, claims, bKey)
  if (isForkMeetingClaim(cell, `${nr},${nc}`)) return true
  if (isForkMeetingClaim(neighbor, `${r},${c}`)) return true
  return false
}

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

// Corridors and rooms share the same wall/opening logic, but get different floor tints
// so a room's footprint (fork/endpoint chambers included) reads as a distinct place —
// not just "a wide stretch of hallway". Room floor is warmer/lighter than corridor floor.
const corridorFloorFill: Record<CellState, string> = {
  fogged: "#130c07",
  visible: "#1e130a",
  reachable: "#22160b",
  completed: "#1c130a",
}
const roomFloorFill: Record<CellState, string> = {
  fogged: "#1c130a",
  visible: "#382412",
  reachable: "#3f2a15",
  completed: "#332210",
}
const WALL_COLOR = "#080502"
const WALL_THICKNESS = 4

const FloorTile = ({
  state,
  open,
  kind,
}: {
  state: CellState
  open: Record<Direction, boolean>
  kind: "room" | "corridor"
}) => {
  const half = CELL / 2
  const fill = kind === "room" ? roomFloorFill[state] : corridorFloorFill[state]
  return (
    <>
      <rect x={-half} y={-half} width={CELL} height={CELL} fill={fill} />
      {!open.n && <rect x={-half} y={-half} width={CELL} height={WALL_THICKNESS} fill={WALL_COLOR} />}
      {!open.s && <rect x={-half} y={half - WALL_THICKNESS} width={CELL} height={WALL_THICKNESS} fill={WALL_COLOR} />}
      {!open.w && <rect x={-half} y={-half} width={WALL_THICKNESS} height={CELL} fill={WALL_COLOR} />}
      {!open.e && <rect x={half - WALL_THICKNESS} y={-half} width={WALL_THICKNESS} height={CELL} fill={WALL_COLOR} />}
    </>
  )
}

// ─── Decorations ────────────────────────────────────────────────────────────────
// Placeholder glyphs only — real sprite art arrives with the sprite-tile renderer
// migration (see docs/game-design/spritesheet-renderer-prep.md). Rendered centered in
// the room's first genuine claim (void or diagonal — never a flank corridor, see
// buildRoomClaims above).

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
    case "fountain":
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
    case "chestProp":
      return (
        <rect x={-6} y={-5} width={12} height={10} rx={1} fill="none" stroke={DECORATION_COLOR} strokeWidth={1.5} />
      )
  }
}

// ─── Click-target markers ───────────────────────────────────────────────────────

// A plain corner's reachable marker has no single direction to point in — a corner or
// T-junction is itself the decision point. A corridor-run target, by contrast, always
// has exactly one direction (the first step out of the player's own cell), so it renders
// as an arrow instead of a dot to hint which way it leads.
const DIR_ROTATION: Record<Direction, number> = { n: 0, e: 90, s: 180, w: 270 }

const ReachableDot = () => <circle r={3} fill="#d0a840" opacity={0.85} />

const RunTargetArrow = ({ dir }: { dir: Direction }) => (
  <polygon points="0,-5 4,4 -4,4" fill="#d0a840" opacity={0.85} transform={`rotate(${DIR_ROTATION[dir]})`} />
)

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteMapView = ({
  grid: gridProp,
  onCellClick,
  revealAllCells = false,
  explorerPos,
  pendingCells,
  className,
}: Props) => {
  const grid = revealAllCells ? revealAll(gridProp) : gridProp
  const scrollRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const claims = useMemo(() => buildRoomClaims(grid), [grid])
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
  const PAD = CELL
  const svgWidth = grid.cols * CELL + PAD * 2
  const svgHeight = grid.rows * CELL + PAD * 2

  useEffect(() => {
    if (!explorerPos || !scrollRef.current || !svgRef.current) return
    const el = scrollRef.current
    const elRect = el.getBoundingClientRect()
    const svgRect = svgRef.current.getBoundingClientRect()
    // Origin accounts for the svg's own offset within the scroll area (e.g. safe-area padding, centering margin)
    const originX = svgRect.left - elRect.left + el.scrollLeft
    const originY = svgRect.top - elRect.top + el.scrollTop
    const x = originX + PAD + explorerPos[1] * CELL + CELL / 2
    const y = originY + PAD + explorerPos[0] * CELL + CELL / 2
    el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPos?.[0], explorerPos?.[1]])

  return (
    <div
      ref={scrollRef}
      className={`flex overflow-auto pt-safe-top pr-safe-right pb-safe-bottom pl-safe-left${className ? ` ${className}` : ""}`}
    >
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="site map"
        className="m-auto"
        style={{ background: "#110d08" }}
      >
        <defs>
          <pattern id="stone" width={20} height={20} patternUnits="userSpaceOnUse">
            <rect width={20} height={20} fill="#110d08" />
            <rect x={0} y={0} width={10} height={10} fill="#130f09" />
            <rect x={10} y={10} width={10} height={10} fill="#130f09" />
          </pattern>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill="url(#stone)" />

        {Array.from({ length: grid.rows + 2 }, (_, ri) => {
          const r = ri - 1
          return Array.from({ length: grid.cols + 2 }, (_, ci) => {
            const c = ci - 1
            const cell = cellAt(grid, r, c)
            const cx = PAD + c * CELL + CELL / 2
            const cy = PAD + r * CELL + CELL / 2
            const cellKey = `${r},${c}`
            const claimOwnerKey = claims.claimedBy.get(cellKey)

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
            if (claimOwnerKey && (cell.type === "empty" || cell.type === "corridor")) {
              const [ownerRow, ownerCol] = claimOwnerKey.split(",").map(Number)
              const owner = grid.cells[ownerRow]?.[ownerCol]
              if (!owner || owner.type !== "room" || owner.state === "fogged") return null
              const state = owner.state
              const open = Object.fromEntries(ALL_DIRS.map(d => [d, isOpenSide(grid, claims, r, c, d)])) as Record<
                Direction,
                boolean
              >
              const decoration = claims.decorationAt.get(cellKey)
              const isCorner = cell.type === "corridor" && isCorridorCorner(cell.dirs)
              const runTarget = cell.type === "corridor" ? corridorRunTargets.get(cellKey) : undefined
              const corridorClickable =
                cell.type === "corridor" &&
                onCellClick &&
                ((cell.state === "reachable" || cell.state === "completed") && isCorner ? true : !!runTarget)
              const clickTarget = runTarget ? [runTarget.row, runTarget.col] : [r, c]
              return (
                <g
                  key={cellKey}
                  transform={`translate(${cx}, ${cy})`}
                  onClick={corridorClickable ? () => onCellClick(clickTarget[0], clickTarget[1]) : undefined}
                  style={{ cursor: corridorClickable ? "pointer" : "default" }}
                >
                  <FloorTile state={state} open={open} kind="room" />
                  {cell.type === "corridor" &&
                    (runTarget ? (
                      <RunTargetArrow dir={runTarget.dir} />
                    ) : (
                      cell.state === "reachable" && isCorner && <ReachableDot />
                    ))}
                  {decoration && <DecorationGlyph kind={decoration} />}
                </g>
              )
            }

            if (cell.type === "empty") return null
            if (cell.state === "fogged") return null

            const open = Object.fromEntries(ALL_DIRS.map(d => [d, isOpenSide(grid, claims, r, c, d)])) as Record<
              Direction,
              boolean
            >

            if (cell.type === "corridor") {
              const isCorner = isCorridorCorner(cell.dirs)
              const runTarget = corridorRunTargets.get(cellKey)
              // A visible run's near end has no corner of its own to click — it borrows the
              // far corner's click target (see findCorridorRunTarget) so a long corridor
              // that scrolls off screen still has something to tap right next to the player.
              const corridorClickable =
                onCellClick && (((cell.state === "reachable" || cell.state === "completed") && isCorner) || !!runTarget)
              const clickTarget = runTarget ? [runTarget.row, runTarget.col] : [r, c]
              return (
                <g
                  key={`${r},${c}`}
                  transform={`translate(${cx}, ${cy})`}
                  onClick={corridorClickable ? () => onCellClick(clickTarget[0], clickTarget[1]) : undefined}
                  style={{ cursor: corridorClickable ? "pointer" : "default" }}
                >
                  <FloorTile state={cell.state} open={open} kind="corridor" />
                  {runTarget ? (
                    <RunTargetArrow dir={runTarget.dir} />
                  ) : (
                    cell.state === "reachable" && isCorner && <ReachableDot />
                  )}
                </g>
              )
            }

            // room cell
            const state = cell.state
            const isCompleted = state === "completed"
            // Only ever a pending-loot marker for a treasure room with a consumable reward — this
            // guards against stale coordinates in pendingCells (e.g. left over from before a site
            // was regenerated) painting the badge onto whatever room now occupies that cell.
            const isPending =
              isCompleted &&
              cell.roomType === "treasure" &&
              cell.reward?.type === "consumable" &&
              (pendingCells?.has(`${r},${c}`) ?? false)
            const clickable = onCellClick && (state === "reachable" || state === "completed")
            const roomR = nodeRadius[cell.roomType]

            return (
              <g
                key={`${r},${c}`}
                transform={`translate(${cx}, ${cy})`}
                onClick={clickable ? () => onCellClick(r, c) : undefined}
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <FloorTile state={state} open={open} kind="room" />
                <g opacity={isCompleted && !isPending ? 0.45 : 1}>
                  <NodeShape
                    type={cell.roomType}
                    state={state}
                    gateVariant={cell.gateVariant}
                    keyColor={cell.keyColor}
                    keyColors={cell.keyColors}
                  />
                </g>
                {isCompleted &&
                  cell.roomType !== "fork" &&
                  cell.roomType !== "entrance" &&
                  (isPending ? <PendingLootBadge r={roomR} /> : <CompletedBadge r={roomR} />)}
              </g>
            )
          })
        })}

        {explorerPos && (
          <ExplorerDot grid={grid} pos={explorerPos} onArrive={() => setSettledExplorerPos(explorerPos)} />
        )}
      </svg>
    </div>
  )
}
