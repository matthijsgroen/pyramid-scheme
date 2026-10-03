import { useEffect, useRef, useState } from "react"

/**
 * A board finishing itself before the family says "solved".
 *
 * The shell freezes the board and starts its banner the moment `solved` goes true
 * (docs/instructions/puzzle-screens.md §3), so a completion animation belongs before that word: a family
 * runs this and hands the shell `done`. Nothing else in core takes part.
 *
 * **What this owns is the clock, not the animation.** It reports how far along the run is and when it is
 * over; what that looks like is entirely the family's business — constellation lights one node per tick,
 * lightbeam runs a thicker beam along its route and then flares the shrine. Anything that can be drawn from
 * a number between 0 and 1 fits.
 *
 * Two rules it enforces on every caller, because both are easy to get wrong and neither is cosmetic:
 *
 * - **The run is capped at about a second.** The shell stops its solve-time clock when it hears "solved",
 *   and that number is the instrument for PUZZLE_FAMILIES.md §3.2's solve-time budget — a three-second
 *   flourish would quietly add three seconds to every board of that family that anyone measures.
 * - **`prefers-reduced-motion` skips the whole thing**, the wait as well as the motion. It reports `done`
 *   at once with `progress` still at 0, so a family drawing its animation from `progress` draws none of it
 *   without having to ask a second question.
 */
export type Celebration = {
  /** How far the run has got, 0 → 1. Stays 0 when the player asked for reduced motion. */
  progress: number
  /** True once the run is over. This is what the family hands the shell as `solved`. */
  done: boolean
}

/** The ceiling on a whole run, for the solve-time reason above. A caller may ask for less, never more. */
const MAX_RUN_MS = 1000

const wantsReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * @param active whether the board is finished and the run should be playing
 * @param ticks how many steps to report — a family with one thing per node passes its node count, one
 *   animating a continuous sweep passes however many frames it wants to draw
 * @param runMs how long the whole run should take, capped at MAX_RUN_MS
 */
export const useCelebration = (active: boolean, ticks: number, runMs = 800): Celebration => {
  const [reached, setReached] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const steps = Math.max(ticks, 1)

  useEffect(() => {
    if (!active) {
      setReached(0)
      setSkipped(false)
      return
    }
    if (wantsReducedMotion()) {
      setSkipped(true)
      return
    }
    const step = Math.min(runMs, MAX_RUN_MS) / steps
    timers.current = Array.from({ length: steps }, (_unused, index) =>
      setTimeout(() => setReached(index + 1), step * (index + 1))
    )
    return () => {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
    }
  }, [active, steps, runMs])

  if (!active) return { progress: 0, done: false }
  if (skipped) return { progress: 0, done: true }
  return { progress: reached / steps, done: reached >= steps }
}
