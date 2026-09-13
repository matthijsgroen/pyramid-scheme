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

  // The box carries the position and has no size of its own, so the figure inside is drawn in cell-local
  // units around the middle of the cell — and a test can ask where the explorer is without caring whether
  // it came out as a sprite or as the fallback dot.
  return (
    <div
      data-explorer=""
      data-at={`${svgPos.x},${svgPos.y}`}
      style={{ position: "absolute", left: svgPos.x, top: svgPos.y, width: 0, height: 0, pointerEvents: "none" }}
    >
      <ExplorerFigure facing={facing} walking={walking} cellMs={segmentDuration} color={color} />
    </div>
  )
}

// The torch the explorer carries, as light on the ground rather than a beam: a soft pool at the feet,
// screen-blended so it lifts whatever stone it lands on instead of painting a yellow disc over it. The
// flicker is mostly opacity, plus a two-pixel wander: a lamp gutters, it does not pulse, and this sits
// under the player's eye the whole game. SCALING it was the version that read as the pool breathing —
// wandering a pixel or two is a flame moving in someone's hand, which is the thing being drawn.
const TORCH_CLASS = "map-torch animate-map-torch motion-reduce:animate-none"
// The legs, cycled by the browser. The frames sit side by side inside a clip one frame wide and the strip
// is slid a whole frame at a time — `steps()` doing what a spritesheet's background-position does, which is
// why the span is the strip's FULL width and the step count is however many frames the facing was drawn
// with. Both come in as inline values, so one keyframe serves every facing and every frame count.
const WALK_CLASS = "animate-map-walk motion-reduce:animate-none"
// A flame reaches past the cell it stands in: at 0.85 the pool did not clear the torch's own tile, so a
// lit corridor read as a row of bright dots rather than as a passage someone is walking down. It stops
// well short of a room, though — a pool is not clipped to the floor, and a wide one lays light over the
// solid rock around a one-cell corridor. What lights a ROOM is the lit place, which is clipped.
const TORCH_RADIUS = CELL * 1.05

/** The colours a pool of light is made of, as one gradient every pool shares.
 *
 * A gradient in CSS rather than a `<radialGradient>` in the map's `<defs>`: there is no id to collide
 * over, so a lit lamp in every third chamber costs nothing, and a pool drawn on its own in a story does
 * not depend on the map being around it to have a fill at all. */
const LIGHT_POOL_FILL =
  "radial-gradient(closest-side, rgba(255,202,106,0.55) 0%, rgba(255,171,61,0.26) 45%, rgba(255,154,46,0) 100%)"

/** What the map's own `<defs>` still carries: the flicker's stylesheet is Tailwind's now, but the stone
 * is one `<svg>` again (see TileLayers) and its defs are where a shared clip belongs. Kept as a component
 * so the map does not have to know what is in it. */
export const LightPoolDefs = () => null

/** A pool of light lying on the floor, screen-blended so it lifts the stone it lands on instead of
 * painting a yellow disc over it. Drawn UNDER whatever carries the flame, so the light is on the floor
 * and the thing is standing in it. Placed by its CENTRE, the way the circle it replaces was. */
export const LightPool = ({ r, cx = 0, cy = 0 }: { r: number; cx?: number; cy?: number }) => (
  <div
    data-light-pool=""
    className={TORCH_CLASS}
    style={{
      position: "absolute",
      left: cx - r,
      top: cy - r,
      width: r * 2,
      height: r * 2,
      background: LIGHT_POOL_FILL,
      mixBlendMode: "screen",
      pointerEvents: "none",
    }}
  />
)

const TorchGlow = () => <LightPool r={TORCH_RADIUS} cy={CELL * 0.22 - FOOT_LIFT} />

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
        <div
          data-explorer-dot=""
          style={{
            position: "absolute",
            left: -EXPLORER_DOT_RADIUS,
            top: -EXPLORER_DOT_RADIUS,
            width: EXPLORER_DOT_RADIUS * 2,
            height: EXPLORER_DOT_RADIUS * 2,
            borderRadius: "50%",
            background: color,
            border: "2px solid #110d08",
            boxSizing: "border-box",
          }}
        />
      </>
    )
  return (
    <>
      <TorchGlow />
      {/* The clip is a box one frame wide with the strip sliding behind it — `overflow: hidden` doing what
          the nested <svg> did.
          Mirrored for west, and the glow is left out of that transform: a pool of light on the floor has
          no handedness, and flipping it would swing it across the cell every time the player turned. */}
      <div
        style={{
          position: "absolute",
          left: -CHAR_W / 2,
          top: CELL / 2 - CHAR_H - FOOT_LIFT,
          width: CHAR_W,
          height: CHAR_H,
          overflow: "hidden",
          transform: facing === "w" ? "scaleX(-1)" : undefined,
        }}
      >
        {walking && frames.length > 1 ? (
          <div
            className={WALK_CLASS}
            style={
              {
                display: "flex",
                width: frames.length * CHAR_W,
                height: CHAR_H,
                "--walk-span": `${-frames.length * CHAR_W}px`,
                animationDuration: `${frames.length * frameMs}ms`,
                animationTimingFunction: `steps(${frames.length})`,
              } as CSSProperties
            }
          >
            {frames.map(url => (
              <img key={url} src={url} width={CHAR_W} height={CHAR_H} alt="" />
            ))}
          </div>
        ) : (
          <img src={frames[step % frames.length]} width={CHAR_W} height={CHAR_H} alt="" />
        )}
      </div>
    </>
  )
}
