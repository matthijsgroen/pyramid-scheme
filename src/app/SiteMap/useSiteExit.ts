import { useCallback, useState } from "react"

export type SiteExit = {
  /** The player stands in an exit chamber and has been asked whether to leave. */
  prompting: boolean
  /** They said yes — the transition that finishes the site is running. */
  leaving: boolean
  arrived: () => void
  confirm: () => void
  cancel: () => void
}

// Leaving a site is a decision, not a trapdoor: an exit is a chamber the player steps INTO, so
// arriving there asks rather than ends the expedition — walking into an off-screen exit can't finish
// the run by itself.
export const useSiteExit = (): SiteExit => {
  const [prompting, setPrompting] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const arrived = useCallback(() => setPrompting(true), [])
  const confirm = useCallback(() => {
    setPrompting(false)
    setLeaving(true)
  }, [])
  const cancel = useCallback(() => setPrompting(false), [])

  return { prompting, leaving, arrived, confirm, cancel }
}
