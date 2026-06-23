import { useMemo } from "react"
import type { NodeType, SiteLayout } from "../../game/siteTypes"
import { computeNavState, type NodeState } from "./useSiteNavigation"

type Point = { x: number; y: number }

type Props = {
  layout: SiteLayout
  completedNodeIds?: string[]
  currentNodeId?: string | null
  onNodeClick?: (nodeId: string) => void
}

const CELL = 90
const FLOOR_H = 80
const CORRIDOR_W = 14
const CORRIDOR_INNER = 6

const corridorPath = (p1: Point, p2: Point): string => {
  if (p1.y === p2.y) return `M ${p1.x},${p1.y} H ${p2.x}`
  if (p1.x === p2.x) return `M ${p1.x},${p1.y} V ${p2.y}`
  const mid = Math.round((p1.x + p2.x) / 2)
  return `M ${p1.x},${p1.y} H ${mid} V ${p2.y} H ${p2.x}`
}

// ─── Entrance marker ─────────────────────────────────────────────────────────

// Drawn behind the node: golden frame + downward arrow pointer above
const EntranceMarker = ({ r }: { r: number }) => (
  <g>
    <rect
      x={-r - 7}
      y={-r - 7}
      width={(r + 7) * 2}
      height={(r + 7) * 2}
      rx={4}
      fill="none"
      stroke="#c08820"
      strokeWidth={2}
      opacity={0.7}
    />
    {/* arrow shaft */}
    <line x1={0} y1={-r - 10} x2={0} y2={-r - 24} stroke="#c08820" strokeWidth={2} opacity={0.8} />
    {/* arrowhead pointing down toward entrance */}
    <polygon points={`0,${-r - 7} -5,${-r - 14} 5,${-r - 14}`} fill="#c08820" opacity={0.9} />
  </g>
)

// ─── Completed overlay ────────────────────────────────────────────────────────

// Small checkmark badge at bottom-right of node, size matched to node radius
const CompletedBadge = ({ r }: { r: number }) => (
  <g transform={`translate(${r - 7}, ${r - 7})`}>
    <circle r={7} fill="#0e1e14" stroke="#3a8858" strokeWidth={1.5} />
    <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#60c080" style={{ userSelect: "none" }}>
      ✓
    </text>
  </g>
)

// ─── Node shape geometry ──────────────────────────────────────────────────────

type ShapeProps = { state: NodeState; isCurrent: boolean }

const PuzzleShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 24
  const fill = puzzleFill[state]
  const stroke = isCurrent ? "#7ab0f0" : puzzleStroke[state]
  const sw = isCurrent ? 2.5 : 1.5
  return (
    <>
      {isCurrent && (
        <rect x={-r - 5} y={-r - 5} width={(r + 5) * 2} height={(r + 5) * 2} rx={3} fill="#2050a0" opacity={0.35} />
      )}
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
      {state !== "fogged" && (
        <>
          <circle cx={-r + 4} cy={-r + 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={r - 4} cy={-r + 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={-r + 4} cy={r - 4} r={2} fill={stroke} opacity={0.7} />
          <circle cx={r - 4} cy={r - 4} r={2} fill={stroke} opacity={0.7} />
        </>
      )}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={18}
        fill={puzzleIcon[state]}
        style={{ userSelect: "none" }}
      >
        {state === "fogged" ? "" : "𓂀"}
      </text>
    </>
  )
}

const ForkShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 10
  const stroke = isCurrent ? "#7ab0f0" : state === "fogged" ? "#2e2018" : "#5a4a30"
  return (
    <polygon
      points={`0,${-r} ${r},0 0,${r} ${-r},0`}
      fill="#1e160e"
      stroke={stroke}
      strokeWidth={isCurrent ? 2 : 1.5}
    />
  )
}

const GateNodeShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 22
  const fill = gateFill[state]
  const stroke = isCurrent ? "#f0c040" : gateStroke[state]
  const sw = isCurrent ? 2.5 : 1.5
  const barColor = state === "fogged" ? "#3a2a10" : state === "revealed-unreachable" ? "#c04020" : "#c09020"
  return (
    <>
      {isCurrent && (
        <rect x={-r - 5} y={-r - 5} width={(r + 5) * 2} height={(r + 5) * 2} rx={2} fill="#806010" opacity={0.3} />
      )}
      <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={1} fill={fill} stroke={stroke} strokeWidth={sw} />
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

const TreasureShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 22
  const fill = treasureFill[state]
  const stroke = isCurrent ? "#f0d060" : treasureStroke[state]
  const sw = isCurrent ? 2.5 : 1.5
  return (
    <>
      {isCurrent && <polygon points={`0,${-r - 6} ${r + 6},0 0,${r + 6} ${-r - 6},0`} fill="#806010" opacity={0.3} />}
      <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fill={treasureIcon[state]}
        style={{ userSelect: "none" }}
      >
        {state === "fogged" ? "" : "𓋴"}
      </text>
    </>
  )
}

const StairheadShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 22
  const cut = 8
  const fill = stairFill[state]
  const stroke = isCurrent ? "#a080f0" : stairStroke[state]
  const sw = isCurrent ? 2.5 : 1.5
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
      {isCurrent && (
        <polygon
          points={pts.replace(/-(\d)/g, (_, d) => `-${+d + 5}`).replace(/(\d),/g, (_, d) => `${+d + 5},`)}
          fill="#402080"
          opacity={0.3}
        />
      )}
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fill={stairIcon[state]}
        style={{ userSelect: "none" }}
      >
        {state === "fogged" ? "" : "𓏤"}
      </text>
    </>
  )
}

const ExitShape = ({ state, isCurrent }: ShapeProps) => {
  const r = 22
  const fill = exitFill[state]
  const stroke = isCurrent ? "#f0f0b0" : exitStroke[state]
  const sw = isCurrent ? 2.5 : 1.5
  return (
    <>
      {isCurrent && <circle r={r + 6} fill="#606010" opacity={0.3} />}
      <circle r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
      {state !== "fogged" && <circle r={r - 6} fill="none" stroke={stroke} strokeWidth={1} opacity={0.4} />}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fill={exitIcon[state]}
        style={{ userSelect: "none" }}
      >
        {state === "fogged" ? "" : "𓇼"}
      </text>
    </>
  )
}

const nodeRadius: Record<NodeType, number> = {
  puzzle: 24,
  fork: 10,
  gate: 22,
  treasure: 22,
  stairhead: 22,
  exit: 22,
}

// Solid background blocker drawn at full opacity before the node shape.
// Occludes any corridor passing through the node position, so corridors
// don't bleed through when the node group is dimmed (e.g. completed opacity).
const NodeBackground = ({ type }: { type: NodeType }) => {
  const bg = "#110d08"
  const r = nodeRadius[type]
  switch (type) {
    case "puzzle":
    case "gate":
      return <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={bg} />
    case "fork":
      return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={bg} />
    case "treasure":
      return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={bg} />
    case "stairhead": {
      const cut = 8
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

const NodeShape = ({ type, state, isCurrent }: ShapeProps & { type: NodeType }) => {
  const p = { state, isCurrent }
  switch (type) {
    case "puzzle":
      return <PuzzleShape {...p} />
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

// ─── Color palettes per node type ─────────────────────────────────────────────

const puzzleFill: Record<NodeState, string> = {
  fogged: "#1a1208",
  "revealed-unreachable": "#2a1e08",
  reachable: "#1a2a10",
  completed: "#1a2a10",
}
const puzzleStroke: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#7a5010",
  reachable: "#507030",
  completed: "#507030",
}
const puzzleIcon: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#d09030",
  reachable: "#90c060",
  completed: "#90c060",
}

const gateFill: Record<NodeState, string> = {
  fogged: "#1a1208",
  "revealed-unreachable": "#281408",
  reachable: "#1e1a08",
  completed: "#1e1a08",
}
const gateStroke: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#883010",
  reachable: "#887020",
  completed: "#887020",
}

const treasureFill: Record<NodeState, string> = {
  fogged: "#1a1208",
  "revealed-unreachable": "#281808",
  reachable: "#221808",
  completed: "#221808",
}
const treasureStroke: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#986020",
  reachable: "#b08030",
  completed: "#b08030",
}
const treasureIcon: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#c08030",
  reachable: "#d0a040",
  completed: "#d0a040",
}

const stairFill: Record<NodeState, string> = {
  fogged: "#1a1208",
  "revealed-unreachable": "#181020",
  reachable: "#141028",
  completed: "#141028",
}
const stairStroke: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#604880",
  reachable: "#7060b0",
  completed: "#7060b0",
}
const stairIcon: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#9070c0",
  reachable: "#a090d0",
  completed: "#a090d0",
}

const exitFill: Record<NodeState, string> = {
  fogged: "#1a1208",
  "revealed-unreachable": "#201c08",
  reachable: "#1c2008",
  completed: "#1c2008",
}
const exitStroke: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#909020",
  reachable: "#a0b020",
  completed: "#a0b020",
}
const exitIcon: Record<NodeState, string> = {
  fogged: "#2e2010",
  "revealed-unreachable": "#c0c030",
  reachable: "#d0d850",
  completed: "#d0d850",
}

// ─── Edge visibility + gate state ─────────────────────────────────────────────

const edgeRevealState = (
  navState: ReturnType<typeof computeNavState>,
  fromId: string,
  toId: string
): "hidden" | "visible" | "locked" | "unlocked" => {
  const s1 = navState.nodeStates[fromId] ?? "fogged"
  const s2 = navState.nodeStates[toId] ?? "fogged"
  if (s1 === "fogged" && s2 === "fogged") return "hidden"
  if (s2 === "revealed-unreachable") return "locked"
  if (s2 === "reachable" || s2 === "completed") return "unlocked"
  return "visible"
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteMapView = ({ layout, completedNodeIds = [], currentNodeId = null, onNodeClick }: Props) => {
  const navState = useMemo(
    () => computeNavState(layout, completedNodeIds, currentNodeId),
    [layout, completedNodeIds, currentNodeId]
  )

  const maxGridX = Math.max(...layout.nodes.map(n => n.gridX))
  const maxFloor = Math.max(...layout.nodes.map(n => n.floor))
  const PAD = 54
  const svgWidth = maxGridX * CELL + PAD * 2
  const svgHeight = maxFloor * FLOOR_H + PAD * 2

  const pos = (gridX: number, floor: number): Point => ({
    x: PAD + gridX * CELL,
    y: PAD + floor * FLOOR_H,
  })

  return (
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

      {/* corridors — all the same neutral stone floor, gate icons on top */}
      {layout.edges.map(edge => {
        const fromNode = layout.nodes.find(n => n.id === edge.fromNodeId)
        const toNode = layout.nodes.find(n => n.id === edge.toNodeId)
        if (!fromNode || !toNode) return null

        const reveal = edgeRevealState(navState, edge.fromNodeId, edge.toNodeId)
        if (reveal === "hidden") return null

        const p1 = pos(fromNode.gridX, fromNode.floor)
        const p2 = pos(toNode.gridX, toNode.floor)
        const d = corridorPath(p1, p2)
        const isLocked = reveal === "locked"
        const isWard = edge.gateType === "ward"

        return (
          <g key={edge.id}>
            {/* wall (outer) */}
            <path d={d} fill="none" stroke="#2a1e12" strokeWidth={CORRIDOR_W} strokeLinecap="square" />
            {/* floor — always neutral stone, no color coding */}
            <path d={d} fill="none" stroke="#3a2a18" strokeWidth={CORRIDOR_INNER} strokeLinecap="square" />
            {/* gate icon at midpoint of the corridor */}
            {edge.gateType &&
              (() => {
                const mx = Math.round((p1.x + p2.x) / 2)
                const my = Math.round((p1.y + p2.y) / 2)
                const isH = p1.y === p2.y
                const hw = CORRIDOR_W / 2 + 2
                // locked: red/orange portcullis bars   unlocked: faint open frame
                const gateColor = isLocked ? (isWard ? "#e05010" : "#e09010") : isWard ? "#40a830" : "#90b020"
                // bars run perpendicular to the corridor
                const barOffsets = [-4, 0, 4]
                return (
                  <g>
                    {/* dark backing so bars are legible */}
                    <rect
                      x={isH ? mx - hw : mx - hw}
                      y={isH ? my - hw : my - hw}
                      width={hw * 2}
                      height={hw * 2}
                      fill="#110d08"
                    />
                    {barOffsets.map(o => (
                      <line
                        key={o}
                        x1={isH ? mx + o : mx - hw}
                        y1={isH ? my - hw : my + o}
                        x2={isH ? mx + o : mx + hw}
                        y2={isH ? my + hw : my + o}
                        stroke={gateColor}
                        strokeWidth={isLocked ? 2 : 1}
                        opacity={isLocked ? 1 : 0.5}
                      />
                    ))}
                    {/* horizontal crossbar on locked gates */}
                    {isLocked && (
                      <line
                        x1={isH ? mx - hw : mx - hw + 2}
                        y1={isH ? my - hw + 2 : my}
                        x2={isH ? mx + hw : mx + hw - 2}
                        y2={isH ? my + hw - 2 : my}
                        stroke={gateColor}
                        strokeWidth={1}
                        opacity={0.6}
                      />
                    )}
                  </g>
                )
              })()}
          </g>
        )
      })}

      {/* nodes */}
      {layout.nodes.map(node => {
        const state = navState.nodeStates[node.id] ?? "fogged"
        const p = pos(node.gridX, node.floor)
        const isCurrent = node.id === currentNodeId
        const isEntrance = node.id === layout.entranceNodeId
        const isCompleted = state === "completed"
        const clickable = onNodeClick && (state === "reachable" || state === "completed")
        const r = nodeRadius[node.type]

        return (
          <g
            key={node.id}
            transform={`translate(${p.x}, ${p.y})`}
            onClick={clickable ? () => onNodeClick(node.id) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {/* solid background covers any corridor passing through this node */}
            <NodeBackground type={node.type} />
            {/* entrance marker drawn behind the node */}
            {isEntrance && state !== "fogged" && <EntranceMarker r={r} />}
            {/* dim completed nodes so they read as "spent" */}
            <g opacity={isCompleted ? 0.45 : 1}>
              <NodeShape type={node.type} state={state} isCurrent={isCurrent} />
            </g>
            {/* checkmark badge on completed non-fork nodes */}
            {isCompleted && node.type !== "fork" && <CompletedBadge r={r} />}
          </g>
        )
      })}
    </svg>
  )
}
