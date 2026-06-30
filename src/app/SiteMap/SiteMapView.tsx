import type { CellState, CorridorCell, FloorGrid, GateVariant, KeyColor, RoomType } from "../../game/siteTypes"
import { revealAll } from "../../game/gridNavigation"
import { ExplorerDot } from "./ExplorerDot"

type Props = {
  grid: FloorGrid
  onCellClick?: (row: number, col: number) => void
  revealAllCells?: boolean
  explorerPos?: readonly [number, number]
  className?: string
}

const CELL = 44
const CORRIDOR_W = 8
const CORRIDOR_INNER = 3

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
  const r = 12
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
  const r = 13
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
  const r = 13
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
  const r = 12
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
  const r = 12
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
  const r = 12
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
  const r = 12
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
  entrance: 12,
  puzzle: 13,
  trap: 13,
  fork: 7,
  gate: 12,
  treasure: 12,
  stairhead: 12,
  exit: 12,
}

const NodeBackground = ({ type }: { type: RoomType }) => {
  const bg = "#110d08"
  const r = nodeRadius[type]
  switch (type) {
    case "entrance": {
      const archPath = `M ${-r},${r} L ${-r},0 A ${r},${r} 0 0,1 ${r},0 L ${r},${r} Z`
      return <path d={archPath} fill={bg} />
    }
    case "puzzle":
    case "trap":
    case "gate":
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={bg} />
    case "fork":
      return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={bg} />
    case "treasure":
      return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={bg} />
    case "stairhead": {
      const cut = 5
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
      return <polygon points={pts} fill={bg} />
    }
    case "exit":
      return <circle r={r} fill={bg} />
  }
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

// ─── Corridor arms (shared by corridor cells and room cells) ──────────────────

type ArmSet = ReadonlySet<"n" | "s" | "e" | "w">

const ConnectionStubs = ({ dirs, state }: { dirs: ArmSet; state: CellState }) => {
  if (state === "fogged") return null
  const HALF = CELL / 2
  const HW = CORRIDOR_W / 2
  const HI = CORRIDOR_INNER / 2
  const armDefs = {
    n: { ox: -HW, oy: -HALF, ow: CORRIDOR_W, oh: HALF + HW, ix: -HI, iy: -HALF, iw: CORRIDOR_INNER, ih: HALF + HI },
    s: { ox: -HW, oy: -HW, ow: CORRIDOR_W, oh: HALF + HW, ix: -HI, iy: -HI, iw: CORRIDOR_INNER, ih: HALF + HI },
    e: { ox: -HW, oy: -HW, ow: HALF + HW, oh: CORRIDOR_W, ix: -HI, iy: -HI, iw: HALF + HI, ih: CORRIDOR_INNER },
    w: {
      ox: -HALF - HW,
      oy: -HW,
      ow: HALF + HW,
      oh: CORRIDOR_W,
      ix: -HALF - HI,
      iy: -HI,
      iw: HALF + HI,
      ih: CORRIDOR_INNER,
    },
  }
  return (
    <>
      {(["n", "s", "e", "w"] as const)
        .filter(d => dirs.has(d))
        .map(dir => {
          const a = armDefs[dir]
          return (
            <g key={dir}>
              <rect x={a.ox} y={a.oy} width={a.ow} height={a.oh} fill="#2a1e12" />
              <rect x={a.ix} y={a.iy} width={a.iw} height={a.ih} fill="#3a2a18" />
            </g>
          )
        })}
    </>
  )
}

const CorridorCellShape = ({ cell }: { cell: CorridorCell }) => <ConnectionStubs dirs={cell.dirs} state={cell.state} />

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteMapView = ({ grid: gridProp, onCellClick, revealAllCells = false, explorerPos, className }: Props) => {
  const grid = revealAllCells ? revealAll(gridProp) : gridProp

  const PAD = 30
  const svgWidth = grid.cols * CELL + PAD * 2
  const svgHeight = grid.rows * CELL + PAD * 2

  return (
    <div className={`overflow-auto${className ? ` ${className}` : ""}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="site map"
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

        {Array.from({ length: grid.rows }, (_, r) =>
          Array.from({ length: grid.cols }, (_, c) => {
            const cell = grid.cells[r][c]
            if (cell.type === "empty") return null

            const cx = PAD + c * CELL + CELL / 2
            const cy = PAD + r * CELL + CELL / 2

            if (cell.type === "corridor") {
              const isCorner =
                cell.dirs.size !== 2 ||
                !((cell.dirs.has("n") && cell.dirs.has("s")) || (cell.dirs.has("e") && cell.dirs.has("w")))
              const corridorClickable = onCellClick && cell.state === "reachable" && isCorner
              return (
                <g
                  key={`${r},${c}`}
                  transform={`translate(${cx}, ${cy})`}
                  onClick={corridorClickable ? () => onCellClick(r, c) : undefined}
                  style={{ cursor: corridorClickable ? "pointer" : "default" }}
                >
                  <CorridorCellShape cell={cell} />
                  {cell.state === "reachable" && isCorner && <circle r={3} fill="#d0a840" opacity={0.85} />}
                </g>
              )
            }

            // room cell
            const state = cell.state
            const isCompleted = state === "completed"
            const clickable = onCellClick && (state === "reachable" || state === "completed")
            const roomR = nodeRadius[cell.roomType]

            return (
              <g
                key={`${r},${c}`}
                transform={`translate(${cx}, ${cy})`}
                onClick={clickable ? () => onCellClick(r, c) : undefined}
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <ConnectionStubs dirs={cell.dirs} state={state} />
                <NodeBackground type={cell.roomType} />
                <g opacity={isCompleted ? 0.45 : 1}>
                  <NodeShape
                    type={cell.roomType}
                    state={state}
                    gateVariant={cell.gateVariant}
                    keyColor={cell.keyColor}
                    keyColors={cell.keyColors}
                  />
                </g>
                {isCompleted && cell.roomType !== "fork" && cell.roomType !== "entrance" && (
                  <CompletedBadge r={roomR} />
                )}
              </g>
            )
          })
        )}

        {explorerPos && <ExplorerDot grid={grid} pos={explorerPos} />}
      </svg>
    </div>
  )
}
