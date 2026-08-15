import { useCallback, useEffect, useState } from "react"
import { useTimeout } from "@/support/useTimeout"

export const HINT_COOLDOWN_MS = 5000
export const HINT_IDLE_MS = 30000

/**
 * When the hint button may be pressed and when it should ask to be pressed, per
 * docs/instructions/puzzle-screens.md §3. Lives here rather than in each family so every puzzle
 * behaves the same: a hint costs a 5s wait, and a player who has stopped moving for 30s gets the
 * button nudged at them rather than being left stuck.
 */
export const useHintAvailability = () => {
  const [revealed, setRevealed] = useState(false)
  const [cooling, setCooling] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [scheduleIdle] = useTimeout()
  const [scheduleCooldown] = useTimeout()

  const restartIdle = useCallback(() => scheduleIdle(HINT_IDLE_MS, () => setNudging(true)), [scheduleIdle])
  useEffect(restartIdle, [restartIdle])

  // Any player move ends the hint: the highlighted cells describe a board state that no longer holds.
  const reportInput = useCallback(() => {
    setRevealed(false)
    setNudging(false)
    restartIdle()
  }, [restartIdle])

  const reveal = useCallback(() => {
    setRevealed(true)
    setNudging(false)
    setCooling(true)
    scheduleCooldown(HINT_COOLDOWN_MS, () => setCooling(false))
    restartIdle()
  }, [restartIdle, scheduleCooldown])

  return { revealed, cooling, nudging, reveal, reportInput }
}
