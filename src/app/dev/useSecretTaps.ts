import { useCallback, useRef, useState } from "react"

// The Android "tap Build number seven times" gesture, for reaching develop mode on a DEPLOYED
// build. The previous single tap was gated on NODE_ENV === "development", so it did nothing on the
// hosted build — which is where phone playtesting actually happens.
//
// Seven deliberate taps inside a short window is what makes it safe to leave enabled in production:
// it cannot be hit by accident, unlike a single tap on a header a player may well prod. Nothing here
// is persisted, so a reload always returns to normal play — a stuck cheat flag on a public build
// would be worse than the inconvenience of re-tapping.

export const SECRET_TAP_COUNT = 7
// Long enough for a deliberate but unhurried sequence; short enough that stray taps minutes apart
// never accumulate into an unlock.
export const SECRET_TAP_WINDOW_MS = 3000

export type SecretTaps = {
  /** Call on each tap. */
  tap: () => void
  /** Taps still needed, once the sequence is underway. 0 when idle or already unlocked. */
  remaining: number
}

export const useSecretTaps = (onUnlock: () => void, now: () => number = Date.now): SecretTaps => {
  const count = useRef(0)
  const lastAt = useRef(0)
  const [remaining, setRemaining] = useState(0)

  const tap = useCallback(() => {
    const at = now()
    // A gap longer than the window abandons the previous attempt and starts a fresh one, so a
    // half-finished sequence never lingers and combines with taps from much later.
    count.current = at - lastAt.current > SECRET_TAP_WINDOW_MS ? 1 : count.current + 1
    lastAt.current = at

    if (count.current >= SECRET_TAP_COUNT) {
      count.current = 0
      setRemaining(0)
      onUnlock()
      return
    }
    setRemaining(SECRET_TAP_COUNT - count.current)
  }, [onUnlock, now])

  return { tap, remaining }
}
