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
// floor's worth of cells that often is what made it stutter on a phone. The gesture writes the DOM
// directly instead, and nothing in the React tree depends on the zoom.
//
// A PINCH TOUCHES NOTHING BUT `transform`. Resizing the sizer or writing `scrollLeft` per move costs
// a layout of the whole floor and a scroll clamp on every frame — and on iOS the browser has usually
// already committed the gesture to its own scrolling (the second finger lands after the first has
// moved, and `preventDefault` past that point is ignored), so our writes and its scrolling then drag
// the map in two directions at once. So the pan is left entirely to the browser's two-finger scroll,
// which composites, and the pinch only scales about the point it started on — a transform the
// compositor can run without laying anything out. The zoom is committed to the sizer once, when the
// fingers lift.
//
// The listeners are attached by hand rather than as JSX props because a wheel handler must be
// non-passive to preventDefault — without that the browser runs its own page zoom on top of this one.
export const useMapZoom = (baseWidth: number, baseHeight: number) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  // The box holding the map's scaled footprint. Sized here, never by React — a re-render would
  // otherwise reset it to the unzoomed size mid-gesture.
  const sizerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  /** The live pinch: the scale the fingers are showing, and the map point they closed on. */
  const pinchRef = useRef<{ zoom: number; anchor: { x: number; y: number } } | null>(null)

  const render = () => {
    const sizer = sizerRef.current
    const map = mapRef.current
    if (!sizer || !map) return
    const zoom = zoomRef.current
    // The footprint the scroll extents are measured from stays at the COMMITTED zoom: the sizer is
    // laid out, and laying the floor out again every frame is the stutter.
    sizer.style.width = `${baseWidth * zoom}px`
    sizer.style.height = `${baseHeight * zoom}px`
    map.style.transformOrigin = "0 0"
    const pinch = pinchRef.current
    if (!pinch) {
      map.style.transform = `scale(${zoom})`
      return
    }
    // Hold the anchor where the committed footprint has it, so the map grows around the fingers
    // rather than around its own top-left corner.
    const shift = zoom - pinch.zoom
    map.style.transform = `translate(${pinch.anchor.x * shift}px, ${pinch.anchor.y * shift}px) scale(${pinch.zoom})`
  }

  useLayoutEffect(render)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    /** Which point of the MAP is under a point on the screen. Measured rather than derived: the map is
     * auto-centred while it is smaller than the viewport, so its offset within the scroll area moves as
     * the zoom changes, and computing the new scroll from the old one silently zooms toward the middle
     * of the screen instead. */
    const mapPointAt = (clientX: number, clientY: number) => {
      const map = mapRef.current
      if (!map) return null
      const { left, top } = map.getBoundingClientRect()
      return { x: (clientX - left) / zoomRef.current, y: (clientY - top) / zoomRef.current }
    }

    /** Scroll so a point of the map sits under a point on the screen, at whatever the zoom is now. */
    const putMapPointUnder = (point: { x: number; y: number }, clientX: number, clientY: number) => {
      const sizer = sizerRef.current
      if (!sizer) return
      const { left, top } = sizer.getBoundingClientRect()
      el.scrollLeft += left + point.x * zoomRef.current - clientX
      el.scrollTop += top + point.y * zoomRef.current - clientY
    }

    /** Zoom to `target`, keeping the point of the map under the given screen point where it is. */
    const zoomTo = (target: number, clientX: number, clientY: number) => {
      const point = mapPointAt(clientX, clientY)
      if (!point) return
      const next = clampZoom(target)
      if (next !== zoomRef.current) {
        zoomRef.current = next
        render()
      }
      putMapPointUnder(point, clientX, clientY)
    }

    let start: { distance: number; zoom: number } | null = null

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      // Exponential so a step feels the same at every zoom level, unlike a fixed +/- amount.
      zoomTo(zoomRef.current * Math.exp(-e.deltaY / 300), e.clientX, e.clientY)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const { x, y } = touchMidpoint(e.touches)
      const anchor = mapPointAt(x, y)
      if (!anchor) return
      start = { distance: touchDistance(e.touches), zoom: zoomRef.current }
      pinchRef.current = { zoom: zoomRef.current, anchor }
      // One promise, for as long as the thing is actually moving.
      if (mapRef.current) mapRef.current.style.willChange = "transform"
    }

    const onTouchMove = (e: TouchEvent) => {
      const pinch = pinchRef.current
      if (!start || !pinch || e.touches.length !== 2) return
      pinch.zoom = clampZoom((start.zoom * touchDistance(e.touches)) / start.distance)
      render()
    }

    /** Fingers up: make the shown scale the real one, and keep what was on screen on screen. */
    const endPinch = () => {
      const pinch = pinchRef.current
      const map = mapRef.current
      if (!pinch || !map) return
      const { left, top } = map.getBoundingClientRect()
      const centerX = el.clientWidth / 2
      const centerY = el.clientHeight / 2
      const { left: elLeft, top: elTop } = el.getBoundingClientRect()
      const held = { x: (elLeft + centerX - left) / pinch.zoom, y: (elTop + centerY - top) / pinch.zoom }
      zoomRef.current = pinch.zoom
      pinchRef.current = null
      start = null
      map.style.willChange = ""
      render()
      putMapPointUnder(held, elLeft + centerX, elTop + centerY)
    }

    const onDoubleClick = (e: MouseEvent) => zoomTo(1, e.clientX, e.clientY)

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    // Passive: the pan belongs to the browser's own two-finger scroll, so there is nothing to cancel.
    el.addEventListener("touchmove", onTouchMove, { passive: true })
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

  // One- and two-finger drags both scroll the map; the browser's own page zoom is off, since this
  // handles it. `zoomRef` is for readers that need the current scale (the explorer centering).
  return {
    scrollRef,
    sizerRef,
    mapRef,
    zoomRef,
    scrollHandlers: { style: { touchAction: "pan-x pan-y" } as const },
  }
}
