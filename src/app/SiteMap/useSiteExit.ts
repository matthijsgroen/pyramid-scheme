import { useCallback, useState } from "react"

export type SiteExit = {
  /** They've arrived — the transition that finishes the site is running. */
  leaving: boolean
  arrived: () => void
}

// Leaving a site is a decision, not a trapdoor: an exit is a chamber the player steps INTO, and the
// walk there ends with a button beside them (useSiteNavigation's arrival prompt, the same one a
// staircase or a shop raises) rather than leaving on its own — `arrived` only runs once that button is
// pressed, so walking into an off-screen exit can't finish the run by itself.
export const useSiteExit = (): SiteExit => {
  const [leaving, setLeaving] = useState(false)

  const arrived = useCallback(() => setLeaving(true), [])

  return { leaving, arrived }
}
