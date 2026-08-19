import { useCallback, useEffect, useRef } from "react"

/**
 * Milliseconds this component has been mounted **and on screen**, read on demand.
 *
 * Wall-clock would measure a lunch break: a puzzle left open in a background tab, or a phone put in a
 * pocket, is not time the player spent on the board. So the clock stops whenever the document is hidden
 * and picks up where it left off when it comes back.
 *
 * Returns a reader rather than a value, because nothing here should re-render on a tick — the caller asks
 * once, at the moment it has something to report.
 */
export const useVisibleElapsed = (): (() => number) => {
  const clock = useRef({ total: 0, since: undefined as number | undefined })

  useEffect(() => {
    // Mount counts as visible unless the document says otherwise, so a board opened in a foreground tab
    // starts its clock without waiting for an event that will never come.
    const start = () => (clock.current.since ??= Date.now())
    const stop = () => {
      const { since } = clock.current
      if (since === undefined) return
      clock.current.total += Date.now() - since
      clock.current.since = undefined
    }

    if (document.visibilityState === "visible") start()
    const onChange = () => (document.visibilityState === "visible" ? start() : stop())
    document.addEventListener("visibilitychange", onChange)
    return () => {
      document.removeEventListener("visibilitychange", onChange)
      stop()
    }
  }, [])

  return useCallback(() => clock.current.total + (clock.current.since ? Date.now() - clock.current.since : 0), [])
}
