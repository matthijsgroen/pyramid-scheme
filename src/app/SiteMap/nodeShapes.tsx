import type { CellState, GateVariant, KeyColor } from "@/game/siteTypes"
import type { Difficulty } from "@/data/difficultyLevels"
import { keyColorHex } from "@/ui/tokens/keyColors"
import { NODE_RADIUS_FORK, NODE_RADIUS_LARGE, NODE_RADIUS_PUZZLE } from "./mapScale"
import type { ShapeKind } from "./nodeKinds"

// WHAT A NODE MARKER LOOKS LIKE: a shape per kind, a colour per state, the badges on its rim. All of it
// vector and all of it stateless — props in, SVG out — so the map's own file is left holding the floor
// rather than the iconography standing on it. A static drawing costs a paint once and never again; it
// was animation inside SVG that cost the map everything (docs/instructions/map-rendering.md).

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

export const CompletedBadge = ({ r }: { r: number }) => (
  <g transform={`translate(${r - 7}, ${r - 7})`}>
    <circle r={7} fill="#0e1e14" stroke="#3a8858" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#60c080" style={{ userSelect: "none" }}>
      ✓
    </text>
  </g>
)

// A treasure that couldn't be picked up (inventory was full) — still waiting to be looted
export const PendingLootBadge = ({ r }: { r: number }) => (
  <g transform={`translate(${r - 7}, ${r - 7})`}>
    <circle r={7} fill="#2a1e08" stroke="#d0a840" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#f0c860" style={{ userSelect: "none" }}>
      !
    </text>
  </g>
)

/** A node's badge, worn by the ART rather than by the marker: a chest stands over its own marker, so the
 * ✓ that says the room is done goes on the chest's lid where the eye already is.
 *
 * Its own little inline `<svg>` inside the HTML layer — the badges are icons, and static vector costs
 * nothing (docs/instructions/map-rendering.md, "The markers"). Placed by its CENTRE, in map units. */
export const NodeBadge = ({ kind, x, y }: { kind: "taken" | "pending"; x: number; y: number }) => (
  <svg
    aria-hidden="true"
    viewBox="-7 -7 14 14"
    style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, overflow: "visible" }}
  >
    {kind === "pending" ? <PendingLootBadge r={7} /> : <CompletedBadge r={7} />}
  </svg>
)

// ─── Node shape geometry ──────────────────────────────────────────────────────

export type ShapeProps = {
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

export const NodeShape = ({
  type,
  state,
  gateVariant,
  keyColor,
  keyColors,
  difficulty,
}: ShapeProps & { type: ShapeKind }) => {
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
