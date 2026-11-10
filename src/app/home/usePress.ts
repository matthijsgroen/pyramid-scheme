import { useCallback, useEffect, useRef, useState } from "react"

// A quick click still shows the press: it is held at least this long before easing back.
const MIN_HELD_MS = 150

/** A pressed state for something the player holds down; `press(false)` lets go, no sooner than MIN_HELD_MS after. */
export const usePress = () => {
  const [pressed, setPressed] = useState(false)
  const since = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const press = useCallback((down: boolean) => {
    clearTimeout(timer.current)
    if (down) {
      since.current = Date.now()
      setPressed(true)
      return
    }
    timer.current = setTimeout(() => setPressed(false), Math.max(0, MIN_HELD_MS - (Date.now() - since.current)))
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return [pressed, press] as const
}
