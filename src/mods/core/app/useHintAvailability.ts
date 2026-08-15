import { useCallback, useEffect, useState } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { useTimeout } from "@/support/useTimeout"

// Long enough that hint-by-hint is a slower way to play than thinking: leaning on the button should
// feel like waiting, not like a second solve button.
export const HINT_COOLDOWN_MS = 10000
// How long a still board waits before the hint button asks to be pressed. A starter board that has
// gone quiet for half a minute is a stuck player; a wizard board that has gone quiet is usually one
// thinking, so the nudge backs off as the tier climbs rather than nagging someone mid-deduction.
export const HINT_IDLE_MS = 30000

export const HINT_IDLE_MS_BY_TIER: Record<Difficulty, number> = {
  starter: 30000,
  junior: 45000,
  expert: 60000,
  master: 75000,
  wizard: 90000,
}

export const hintIdleDelay = (difficulty?: Difficulty): number => HINT_IDLE_MS_BY_TIER[difficulty ?? "starter"]

/**
 * When the hint button may be pressed and when it should ask to be pressed, per
 * docs/instructions/puzzle-screens.md §3. Lives here rather than in each family so every puzzle
 * behaves the same: a hint costs a wait, and a player who has stopped moving gets the button nudged
 * at them rather than being left stuck. The idle wait is the caller's to choose (see hintIdleDelay).
 */
export const useHintAvailability = (idleMs: number = HINT_IDLE_MS) => {
  const [revealed, setRevealed] = useState(false)
  const [cooling, setCooling] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [scheduleIdle] = useTimeout()
  const [scheduleCooldown] = useTimeout()

  const restartIdle = useCallback(() => scheduleIdle(idleMs, () => setNudging(true)), [scheduleIdle, idleMs])
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
    setHintsUsed(used => used + 1)
    scheduleCooldown(HINT_COOLDOWN_MS, () => setCooling(false))
    restartIdle()
  }, [restartIdle, scheduleCooldown])

  return { revealed, cooling, nudging, hintsUsed, reveal, reportInput }
}
