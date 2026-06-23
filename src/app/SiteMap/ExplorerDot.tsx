import { useEffect, useRef, useState } from "react"

type Point = { x: number; y: number }

type Props = {
  from: Point
  to: Point
  /** Duration in ms. Default 250. */
  duration?: number
  /** If true, snap to `to` immediately. */
  snap?: boolean
  color?: string
}

// Animated dot that glides from `from` to `to` along a straight SVG path.
// Tap/snap mid-glide: set snap=true to jump to destination.
export const ExplorerDot = ({ from, to, duration = 250, snap = false, color = "#1d4ed8" }: Props) => {
  const [pos, setPos] = useState<Point>(from)
  const startRef = useRef<Point>(from)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (snap) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      setPos(to)
      return
    }

    startRef.current = pos
    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const t = Math.min(elapsed / duration, 1)
      const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1 // ease-out cubic
      setPos({
        x: startRef.current.x + (to.x - startRef.current.x) * eased,
        y: startRef.current.y + (to.y - startRef.current.y) * eased,
      })
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to.x, to.y, snap])

  return (
    <circle cx={pos.x} cy={pos.y} r={8} fill={color} stroke="white" strokeWidth={2} style={{ pointerEvents: "none" }} />
  )
}
