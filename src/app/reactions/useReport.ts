import { useCallback, useEffect, useRef } from "react"
import { useMergedReactions, type Reaction, type ReactionListener } from "@/app/reactions/reactionContributions"

/**
 * One stable function that reports to every listener. `useMergedReactions` returns a new function every
 * render; holding the latest in a ref keeps it out of effect dependencies, so a re-render reports nothing.
 */
export const useReport = (): ReactionListener => {
  const react = useMergedReactions()
  const latest = useRef(react)
  useEffect(() => {
    latest.current = react
  })
  return useCallback((reaction: Reaction) => latest.current(reaction), [])
}

/**
 * Reports `reaction` once while `key` holds. A new key reports again; `undefined` reports nothing and
 * re-arms, so the same fact can be reported at a later moment. The key lives in a ref, which survives
 * StrictMode's second run of an effect.
 */
export const useReportOnce = (key: string | undefined, reaction: Reaction): void => {
  const report = useReport()
  const reported = useRef<string | undefined>(undefined)
  const latest = useRef(reaction)
  useEffect(() => {
    latest.current = reaction
  })
  useEffect(() => {
    if (key === undefined) {
      reported.current = undefined
      return
    }
    if (reported.current === key) return
    reported.current = key
    report(latest.current)
  }, [key, report])
}
