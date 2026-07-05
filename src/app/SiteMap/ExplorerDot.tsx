import { useEffect, useRef, useState } from "react"
import type { FloorGrid } from "../../game/siteTypes"
import { findPath } from "../../game/gridNavigation"
import { CELL, EXPLORER_DOT_RADIUS } from "./mapScale"

type Point = { x: number; y: number }

type Props = {
  grid: FloorGrid
  pos: readonly [number, number]
  cellSize?: number
  padding?: number
  /** Duration per grid-cell step in ms. Default 120. */
  segmentDuration?: number
  color?: string
  /** Fires once the dot visually settles at `pos` — on arrival, on an instant snap, and on mount. */
  onArrive?: () => void
}

export const ExplorerDot = ({
  grid,
  pos,
  cellSize = CELL,
  padding = CELL,
  segmentDuration = 120,
  color = "#ffd060",
  onArrive,
}: Props) => {
  const toPixel = ([r, c]: readonly [number, number]): Point => ({
    x: padding + c * cellSize + cellSize / 2,
    y: padding + r * cellSize + cellSize / 2,
  })

  const [svgPos, setSvgPos] = useState<Point>(toPixel(pos))
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

    if (isFirstRun) {
      setSvgPos(toPixel(pos))
      onArriveRef.current?.()
      return
    }

    const waypoints = findPath(grid, from, pos).map(toPixel)
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
    let segIdx = 0
    let segStart = waypoints[0]
    let segEnd = waypoints[1]
    let startTime: number | null = null

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
          startTime = ts
          rafRef.current = requestAnimationFrame(animate)
        } else {
          animatingRef.current = false
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos[0], pos[1]])

  return (
    <circle
      cx={svgPos.x}
      cy={svgPos.y}
      r={EXPLORER_DOT_RADIUS}
      fill={color}
      stroke="#110d08"
      strokeWidth={2}
      style={{ pointerEvents: "none" }}
    />
  )
}
