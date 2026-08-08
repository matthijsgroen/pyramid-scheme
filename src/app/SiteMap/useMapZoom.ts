import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

export const MIN_ZOOM = 0.5
// Room to lean in on a single room's artwork, not just to read the layout.
export const MAX_ZOOM = 5

const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

const touchDistance = (touches: TouchList): number =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

const touchMidpoint = (touches: TouchList): { x: number; y: number } => ({
  x: (touches[0].clientX + touches[1].clientX) / 2,
  y: (touches[0].clientY + touches[1].clientY) / 2,
})

// Scales the map inside its own scroll area: pinch on touch, ctrl/⌘ + wheel on desktop (which is
// also what a trackpad pinch sends). Plain wheel is left alone so it still pans the map.
//
// The listeners are attached by hand rather than as JSX props because React registers wheel and
// touch handlers passively — a passive handler can't preventDefault, and without that the browser
// runs its own page zoom on top of this one.
export const useMapZoom = (scrollRef: RefObject<HTMLDivElement | null>) => {
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  // Where the gesture is anchored, in scroll-area coordinates, plus the scale step it asks for.
  // Applied after the map has re-laid-out at the new size (below), so the point under the fingers
  // — or the cursor — stays put instead of the map sliding away from under the gesture.
  const focal = useRef<{ x: number; y: number; ratio: number } | null>(null)
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    const f = focal.current
    if (!el || !f) return
    focal.current = null
    el.scrollLeft = (el.scrollLeft + f.x) * f.ratio - f.x
    el.scrollTop = (el.scrollTop + f.y) * f.ratio - f.y
  }, [zoom, scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const zoomTo = (target: number, clientX: number, clientY: number) => {
      const next = clampZoom(target)
      const previous = zoomRef.current
      if (next === previous) return
      const rect = el.getBoundingClientRect()
      focal.current = { x: clientX - rect.left, y: clientY - rect.top, ratio: next / previous }
      zoomRef.current = next
      setZoom(next)
    }

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      // Exponential so a step feels the same at every zoom level, unlike a fixed +/- amount.
      zoomTo(zoomRef.current * Math.exp(-e.deltaY / 300), e.clientX, e.clientY)
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { distance: touchDistance(e.touches), zoom: zoomRef.current }
    }
    const onTouchMove = (e: TouchEvent) => {
      const start = pinch.current
      if (!start || e.touches.length !== 2) return
      e.preventDefault()
      const { x, y } = touchMidpoint(e.touches)
      zoomTo((start.zoom * touchDistance(e.touches)) / start.distance, x, y)
    }
    const endPinch = () => {
      pinch.current = null
    }
    // Double-click / double-tap goes back to 1×, anchored where it was aimed — the way out of a
    // zoom you pinched too far, without a control sitting on top of the map.
    const onDoubleClick = (e: MouseEvent) => {
      if (zoomRef.current !== 1) zoomTo(1, e.clientX, e.clientY)
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", endPinch)
    el.addEventListener("touchcancel", endPinch)
    el.addEventListener("dblclick", onDoubleClick)
    return () => {
      el.removeEventListener("dblclick", onDoubleClick)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", endPinch)
      el.removeEventListener("touchcancel", endPinch)
    }
  }, [scrollRef])

  // One-finger drag still scrolls the map; the browser's own pinch-zoom is off, since this handles it.
  return { zoom, zoomHandlers: { style: { touchAction: "pan-x pan-y" } as const } }
}
