import { useEffect, useLayoutEffect, useRef } from "react"

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
// Double-click / double-tap goes back to 1×.
//
// The zoom level is NOT React state: a pinch fires a move event per frame, and re-rendering a
// floor's worth of cells that often is what made it stutter on a phone. Instead the gesture writes
// the DOM directly — the sizer box takes the scaled footprint (so the scroll extents are real),
// and the map itself is a `scale()` transform, which the browser can composite. Nothing in the
// React tree depends on the zoom, so nothing re-renders while pinching.
//
// The listeners are attached by hand rather than as JSX props because React registers wheel and
// touch handlers passively — a passive handler can't preventDefault, and without that the browser
// runs its own page zoom on top of this one.
export const useMapZoom = (baseWidth: number, baseHeight: number) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  // The box holding the map's scaled footprint. Sized here, never by React — a re-render would
  // otherwise reset it to the unzoomed size mid-gesture.
  const sizerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef(1)

  const render = () => {
    const sizer = sizerRef.current
    const map = mapRef.current
    if (!sizer || !map) return
    const zoom = zoomRef.current
    sizer.style.width = `${baseWidth * zoom}px`
    sizer.style.height = `${baseHeight * zoom}px`
    map.style.transformOrigin = "0 0"
    map.style.transform = `scale(${zoom})`
  }

  useLayoutEffect(render)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Keeps the point under the gesture under the gesture. Measured rather than derived: the map
    // is auto-centered while it's smaller than the viewport, so its offset within the scroll area
    // moves as the zoom changes, and computing the new scroll from the old one silently zooms
    // toward the middle of the screen instead.
    const zoomTo = (target: number, clientX: number, clientY: number) => {
      const sizer = sizerRef.current
      if (!sizer) return
      const next = clampZoom(target)
      const previous = zoomRef.current
      if (next === previous) return

      const before = sizer.getBoundingClientRect()
      const mapX = (clientX - before.left) / previous
      const mapY = (clientY - before.top) / previous

      zoomRef.current = next
      render()

      const after = sizer.getBoundingClientRect()
      el.scrollLeft += after.left + mapX * next - clientX
      el.scrollTop += after.top + mapY * next - clientY
    }

    let pinch: { distance: number; zoom: number } | null = null

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      // Exponential so a step feels the same at every zoom level, unlike a fixed +/- amount.
      zoomTo(zoomRef.current * Math.exp(-e.deltaY / 300), e.clientX, e.clientY)
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { distance: touchDistance(e.touches), zoom: zoomRef.current }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault()
      const { x, y } = touchMidpoint(e.touches)
      zoomTo((pinch.zoom * touchDistance(e.touches)) / pinch.distance, x, y)
    }
    const endPinch = () => {
      pinch = null
    }
    const onDoubleClick = (e: MouseEvent) => zoomTo(1, e.clientX, e.clientY)

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", endPinch)
    el.addEventListener("touchcancel", endPinch)
    el.addEventListener("dblclick", onDoubleClick)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", endPinch)
      el.removeEventListener("touchcancel", endPinch)
      el.removeEventListener("dblclick", onDoubleClick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseWidth, baseHeight])

  // One-finger drag still scrolls the map; the browser's own pinch-zoom is off, since this
  // handles it. `zoomRef` is for readers that need the current scale (the explorer centering).
  return {
    scrollRef,
    sizerRef,
    mapRef,
    zoomRef,
    scrollHandlers: { style: { touchAction: "pan-x pan-y" } as const },
  }
}
