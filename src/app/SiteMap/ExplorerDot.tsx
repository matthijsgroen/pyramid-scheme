import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { Direction, FloorGrid } from "../../game/siteTypes"
import { findPath } from "../../game/gridNavigation"
import { CELL, EXPLORER_DOT_RADIUS, cellCenter } from "./mapScale"
import { sharedTileFrames } from "./tileAssets"

type Point = { x: number; y: number }

// The explorer is a figure standing IN its cell: a shade under a cell wide, bottom-anchored so the feet
// sit on the cell's floor line and the head stays inside its own square. Small enough that the map still
// reads as a map, big enough to be a person rather than a token.
const CHAR_W = 40
const CHAR_H = 70
// A few units off the cell's bottom edge. Standing exactly on it, the feet met the wall band below and the
// figure read as leaning against the wall rather than standing in front of it.
const FOOT_LIFT = 5
// How much ground ONE full walk cycle covers. A stride is a distance, not a frame count: whether a facing
// is drawn in four frames or in twelve, the legs must come back to the same pose after the same two cells,
// or the character strides at a different rate depending on which way it is walking.
//
// So the frame rate is not a knob of its own — it falls out of this and the facing's own frame count.
// Four frames over two cells at 180ms a cell is a frame every 90ms; twelve frames is one every 30ms.
// Slow the legs by slowing `segmentDuration`; anything else pulls the feet off the ground.
//
// The cycle runs on the browser's clock rather than on the walk's own progress, which it can afford
// because every cell takes the same time — so the two stay locked without React being asked each frame.
const CELLS_PER_CYCLE = 2

// Which way the character faces, taken from the step being walked — no stored direction, no state to keep
// in sync with the route. West is EAST mirrored, so the art is three files rather than four.
const facingOf = (dx: number, dy: number): Direction =>
  Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : dy > 0 ? "s" : "n"

type Props = {
  grid: FloorGrid
  pos: readonly [number, number]
  /** Duration per grid-cell step in ms. Default 180 — and the walk cycle's frame rate follows it. */
  segmentDuration?: number
  color?: string
  /** Fires once the dot visually settles at `pos` — on arrival, on an instant snap, and on mount. */
  onArrive?: () => void
}

export const ExplorerDot = ({ grid, pos, segmentDuration = 180, color = "#ffd060", onArrive }: Props) => {
  // The map lays cells out on a stretched pitch so every wall has a place of its own — the dot walks
  // between floor-square centres, wherever those land.
  const toPixel = ([r, c]: readonly [number, number]): Point => {
    const { cx, cy } = cellCenter(r, c)
    return { x: cx, y: cy }
  }

  const [svgPos, setSvgPos] = useState<Point>(toPixel(pos))
  // Facing the viewer at rest, which is how a character sprite is meant to be met.
  const [facing, setFacing] = useState<Direction>("s")
  // Whether the legs are cycling. Two renders per walk — one to start the CSS animation, one to stop it —
  // instead of one per animation frame.
  const [walking, setWalking] = useState(false)
  const prevPosRef = useRef<readonly [number, number]>(pos)
  const animatingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  // ponytail: skip animation on first render so stale saved position doesn't slide into view
  const mountedRef = useRef(false)
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive

  useEffect(() => {
    const from = prevPosRef.current
    prevPosRef.current = pos
    // Mark mounted on this effect's very first run, whether or not pos happens to have
    // changed by then — otherwise a `pos` that's still unchanged on mount leaves this flag
    // false, and the *next* real move (however much later) gets wrongly treated as the
    // initial settle and skips its animation entirely.
    const isFirstRun = !mountedRef.current
    mountedRef.current = true

    if (from[0] === pos[0] && from[1] === pos[1]) return
    setFacing(facingOf(pos[1] - from[1], pos[0] - from[0]))

    if (isFirstRun) {
      setSvgPos(toPixel(pos))
      onArriveRef.current?.()
      return
    }

    const route = findPath(grid, from, pos)
    // Nothing to walk along: appear there instead of sliding through the stone in between.
    if (route.length === 0) {
      setSvgPos(toPixel(pos))
      onArriveRef.current?.()
      return
    }
    const waypoints = route.map(toPixel)
    const dest = waypoints[waypoints.length - 1]

    // Snap if mid-glide
    if (animatingRef.current) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      animatingRef.current = false
      setSvgPos(dest)
      onArriveRef.current?.()
      return
    }

    if (waypoints.length <= 1) {
      setSvgPos(dest)
      onArriveRef.current?.()
      return
    }

    animatingRef.current = true
    setWalking(true)
    let segIdx = 0
    let segStart = waypoints[0]
    let segEnd = waypoints[1]
    let startTime: number | null = null
    const faceSegment = () => setFacing(facingOf(segEnd.x - segStart.x, segEnd.y - segStart.y))
    faceSegment()

    const animate = (ts: number) => {
      if (startTime === null) startTime = ts
      const t = Math.min((ts - startTime) / segmentDuration, 1)
      const eased = 1 - (1 - t) * (1 - t) // ease-out quad
      setSvgPos({
        x: segStart.x + (segEnd.x - segStart.x) * eased,
        y: segStart.y + (segEnd.y - segStart.y) * eased,
      })
      if (t >= 1) {
        segIdx++
        if (segIdx < waypoints.length - 1) {
          segStart = waypoints[segIdx]
          segEnd = waypoints[segIdx + 1]
          faceSegment()
          startTime = ts
          rafRef.current = requestAnimationFrame(animate)
        } else {
          animatingRef.current = false
          setWalking(false)
          onArriveRef.current?.()
        }
      } else {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      animatingRef.current = false
      setWalking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1]])

  // The group carries the position, so the figure inside is drawn in cell-local units — and a test can
  // ask where the explorer is without caring whether it came out as a sprite or as the fallback dot.
  return (
    <g data-explorer="" transform={`translate(${svgPos.x}, ${svgPos.y})`} style={{ pointerEvents: "none" }}>
      <ExplorerFigure facing={facing} walking={walking} cellMs={segmentDuration} color={color} />
    </g>
  )
}

// The torch the explorer carries, as light on the ground rather than a beam: a soft pool at the feet,
// screen-blended so it lifts whatever stone it lands on instead of painting a yellow disc over it. The
// flicker is mostly opacity, plus a two-pixel wander: a lamp gutters, it does not pulse, and this sits
// under the player's eye the whole game. SCALING it was the version that read as the pool breathing —
// wandering a pixel or two is a flame moving in someone's hand, which is the thing being drawn.
const TORCH_CLASS = "map-torch"
// The legs, cycled by the browser. The frames sit side by side inside a clip one frame wide and the strip
// is slid a whole frame at a time — `steps()` doing what a spritesheet's background-position does, which is
// why the span is the strip's FULL width and the step count is however many frames the facing was drawn
// with. Both come in as inline values, so one keyframe serves every facing and every frame count.
const WALK_CLASS = "map-walk"
const TORCH_RADIUS = CELL * 0.85
const TORCH_CSS = `
.${TORCH_CLASS} { animation: map-torch-flicker 2.2s ease-in-out infinite; }
@keyframes map-torch-flicker {
  0%   { opacity: 0.86; transform: translate(0, 0); }
  18%  { opacity: 1;    transform: translate(1px, -1px); }
  37%  { opacity: 0.82; transform: translate(-1px, 1px); }
  58%  { opacity: 0.97; transform: translate(1px, 1px); }
  79%  { opacity: 0.85; transform: translate(-1px, 0); }
  100% { opacity: 0.86; transform: translate(0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .${TORCH_CLASS} { animation: none; }
}
.${WALK_CLASS} { animation-name: map-walk; animation-iteration-count: infinite; }
@keyframes map-walk { to { transform: translateX(var(--walk-span)); } }
@media (prefers-reduced-motion: reduce) {
  .${WALK_CLASS} { animation: none; }
}
`

export const LIGHT_POOL_ID = "torch-pool"

/** The gradient every pool of light on this map is filled with, defined ONCE.
 *
 * Rendered into the map's own `<defs>` rather than beside each pool: a lit lamp in every third chamber
 * would otherwise redeclare the same id a dozen times, and the explorer's pool would depend on the
 * explorer being mounted to have a fill at all. */
export const LightPoolDefs = () => (
  <>
    <style>{TORCH_CSS}</style>
    <radialGradient id={LIGHT_POOL_ID}>
      <stop offset="0" stopColor="#ffca6a" stopOpacity="0.55" />
      <stop offset="0.45" stopColor="#ffab3d" stopOpacity="0.26" />
      <stop offset="1" stopColor="#ff9a2e" stopOpacity="0" />
    </radialGradient>
  </>
)

/** A pool of light lying on the floor, screen-blended so it lifts the stone it lands on instead of
 * painting a yellow disc over it. Drawn UNDER whatever carries the flame, so the light is on the floor
 * and the thing is standing in it. */
export const LightPool = ({ r, cy = 0 }: { r: number; cy?: number }) => (
  <circle
    data-light-pool=""
    className={TORCH_CLASS}
    cy={cy}
    r={r}
    fill={`url(#${LIGHT_POOL_ID})`}
    style={{ mixBlendMode: "screen" }}
    pointerEvents="none"
  />
)

const TorchGlow = () => (
  <>
    {/* The style tag comes with the defs on the map. A story that renders the figure on its own still
        needs the flicker, and a duplicate <style> is harmless where a duplicate id is not. */}
    <style>{TORCH_CSS}</style>
    <LightPool r={TORCH_RADIUS} cy={CELL * 0.22 - FOOT_LIFT} />
  </>
)

/**
 * The explorer as drawn, in cell-local units around the centre of the cell it stands on. Separate from the
 * walking above so the look can be judged on its own (see the Facings story) and swapped without touching
 * the movement: the art is three PNGs in `tiles/default/`, and with none of them present this falls back
 * to the dot the map had before — so no look is locked in by anything here.
 *
 * The walk cycle is a CSS animation over a strip laid out from those same numbered files, so it keeps time
 * on the browser's clock and does not need a React render per frame.
 */
export const ExplorerFigure = ({
  facing,
  step = 0,
  walking = false,
  cellMs = 180,
  color = "#ffd060",
}: {
  facing: Direction
  /** Which frame to stand on when NOT walking. Taken modulo this facing's own frame count. */
  step?: number
  /** Cycle the legs. The cycle is a CSS animation, so it keeps time whether or not React renders. */
  walking?: boolean
  /** How long one grid cell takes to walk, in ms. The frame rate follows from it and the frame count. */
  cellMs?: number
  color?: string
}) => {
  // Three directions of art, not four: facing west is facing east mirrored.
  const frames = sharedTileFrames(`explorer-${facing === "w" ? "e" : facing}`)
  // However many frames this facing was drawn with, they share out the same two cells of ground.
  const frameMs = (cellMs * CELLS_PER_CYCLE) / Math.max(frames.length, 1)
  if (frames.length === 0)
    return (
      <>
        <TorchGlow />
        <circle r={EXPLORER_DOT_RADIUS} fill={color} stroke="#110d08" strokeWidth={2} />
      </>
    )
  return (
    <>
      <TorchGlow />
      {/* Mirrored for west, and the glow is left out of that transform: a pool of light on the floor has
          no handedness, and flipping it would swing it across the cell every time the player turned. */}
      <g transform={facing === "w" ? "scale(-1, 1)" : undefined}>
        {/* A nested <svg> is the clip: one frame wide, whatever the strip inside it is doing. */}
        <svg x={-CHAR_W / 2} y={CELL / 2 - CHAR_H - FOOT_LIFT} width={CHAR_W} height={CHAR_H} overflow="hidden">
          {walking && frames.length > 1 ? (
            <g
              className={WALK_CLASS}
              style={
                {
                  "--walk-span": `${-frames.length * CHAR_W}px`,
                  animationDuration: `${frames.length * frameMs}ms`,
                  animationTimingFunction: `steps(${frames.length})`,
                } as CSSProperties
              }
            >
              {frames.map((url, i) => (
                <image key={url} href={url} x={i * CHAR_W} width={CHAR_W} height={CHAR_H} />
              ))}
            </g>
          ) : (
            <image href={frames[step % frames.length]} width={CHAR_W} height={CHAR_H} />
          )}
        </svg>
      </g>
    </>
  )
}
