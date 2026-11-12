import { useCallback, useRef, useState } from "react"

// The Android "tap Build number seven times" gesture, for reaching develop mode on a deployed
// preview build — which is where phone playtesting happens. A release build carries no developer
// tools (devToolsBuild.ts), so there the taps open nothing.
//
// Seven deliberate taps inside a short window cannot be hit by accident, unlike a single tap on a
// header a player may well prod. Nothing here is persisted, so a reload always returns to normal play.

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
