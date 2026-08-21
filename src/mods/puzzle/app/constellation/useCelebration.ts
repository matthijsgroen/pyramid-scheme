import { useEffect, useRef, useState } from "react"

/**
 * A solved board finishing one node at a time, before the family reports the solve.
 *
 * The shell freezes the board and lands its banner the moment `solved` goes true
 * (docs/instructions/puzzle-screens.md §3), so a family that wants to celebrate first simply does not report
 * solved yet: it runs this and hands the shell `done`. Nothing in core needs to know.
 *
 * **Two things it is deliberately built to.**
 *
 * The whole run stays **about a second**. The shell stops its clock when it is told the board is solved, and
 * that number is the instrument for PUZZLE_FAMILIES.md §3.2's solve-time budget — so a celebration that ran
 * for three seconds would quietly add three seconds to every measured board. The stagger tightens as nodes
 * are added rather than letting the total grow with them.
 *
 * And **a player who asked for less motion gets none of it**: `prefers-reduced-motion` skips straight to
 * done, rather than holding the banner back for an animation that is not playing.
 *
 * Lives here rather than in core because constellation is its only caller. It is written to be lifted
 * unchanged the moment a second family wants one.
 */
export type Celebration = {
  /** Node indices that have had their turn, in order — the caller draws whatever "finished" looks like. */
  celebrated: ReadonlySet<number>
  /** True once the last node's animation has run its course. This is what the family hands the shell. */
  done: boolean
}

/** The stagger, start of the first node to start of the last. Everything else derives so it cannot drift. */
const STAGGER_MS = 560
const MAX_STEP_MS = 70
/** One animation's length — `--animate-bloom` in index.css. The last node needs it before the banner lands. */
const BLOOM_MS = 420

const wantsReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

export const useCelebration = (active: boolean, nodes: number): Celebration => {
  const [reached, setReached] = useState(0)
  const [done, setDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!active) {
      setReached(0)
      setDone(false)
      setSkipped(false)
      return
    }
    if (wantsReducedMotion()) {
      setSkipped(true)
      return
    }
    const step = Math.min(MAX_STEP_MS, STAGGER_MS / Math.max(nodes, 1))
    timers.current = [
      ...Array.from({ length: nodes }, (_unused, index) => setTimeout(() => setReached(index + 1), step * index)),
      setTimeout(() => setDone(true), step * Math.max(nodes - 1, 0) + BLOOM_MS),
    ]
    return () => {
      for (const timer of timers.current) clearTimeout(timer)
      timers.current = []
    }
  }, [active, nodes])

  if (!active) return { celebrated: new Set(), done: false }
  // Reduced motion means none of it: no node is marked, so nothing animates, and the solve is reported at
  // once rather than after a run the player will not see.
  if (skipped) return { celebrated: new Set(), done: true }
  return { celebrated: new Set(Array.from({ length: reached }, (_unused, index) => index)), done }
}
