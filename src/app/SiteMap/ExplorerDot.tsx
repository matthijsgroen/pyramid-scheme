import { useEffect, useRef, useState } from "react"
import type { FloorGrid } from "../../game/siteTypes"
import { findPath } from "../../game/gridNavigation"

export const SITE_MAP_CELL = 44
export const SITE_MAP_PAD = 30

type Point = { x: number; y: number }

type Props = {
  grid: FloorGrid
  pos: readonly [number, number]
  cellSize?: number
  padding?: number
  /** Duration per grid-cell step in ms. Default 120. */
  segmentDuration?: number
  color?: string
}

export const ExplorerDot = ({
  grid,
  pos,
  cellSize = SITE_MAP_CELL,
  padding = SITE_MAP_PAD,
  segmentDuration = 120,
  color = "#ffd060",
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

  useEffect(() => {
    const from = prevPosRef.current
    prevPosRef.current = pos

    if (from[0] === pos[0] && from[1] === pos[1]) return

    if (!mountedRef.current) {
      mountedRef.current = true
      setSvgPos(toPixel(pos))
      return
    }
    mountedRef.current = true

    const waypoints = findPath(grid, from, pos).map(toPixel)
    const dest = waypoints[waypoints.length - 1]

    // Snap if mid-glide
    if (animatingRef.current) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      animatingRef.current = false
      setSvgPos(dest)
      return
    }

    if (waypoints.length <= 1) {
      setSvgPos(dest)
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
      r={6}
      fill={color}
      stroke="#110d08"
      strokeWidth={2}
      style={{ pointerEvents: "none" }}
    />
  )
}
