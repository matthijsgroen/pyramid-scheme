import { useCallback, useEffect, useRef, useState } from "react"

type ExpeditionFlowArgs = {
  journeyId: string
  levelNr: number
  completionCount: number
  /** The level whose interior the player backed out of, if any — set while an interior is open. */
  interiorLevelNr: number | null | undefined
  /** Whether this journey authors an interior site at all. */
  hasInterior: boolean
  setInteriorLevel: (journeyId: string, levelNr: number | null) => void
  onNextLevel?: () => void
  onClose?: () => void
}

export type ExpeditionFlow = {
  /** The board is sliding away and the next level's board is sliding in. */
  startNextLevel: boolean
  /** The solved board is showing its completion celebration. */
  levelCompleted: boolean
  /** The interior site map covers the board. */
  showingInterior: boolean
  completeLevel: () => void
  completionFinished: () => void
  interiorComplete: () => void
  leaveInterior: () => void
}

// One expedition's progression: solve the exterior board, celebrate, drop into the interior if the
// journey has one, then transition to the next level — plus the timers that choreograph it.
export const useExpeditionFlow = ({
  journeyId,
  levelNr,
  completionCount,
  interiorLevelNr,
  hasInterior,
  setInteriorLevel,
  onNextLevel,
  onClose,
}: ExpeditionFlowArgs): ExpeditionFlow => {
  // Restore the interior if the player backed out of it mid-visit.
  const restoringInterior = hasInterior && interiorLevelNr === levelNr

  const [transitionToLevel, setTransitionToLevel] = useState(levelNr)
  const [levelCompleted, setLevelCompleted] = useState(false)
  const [showingInterior, setShowingInterior] = useState(restoringInterior)

  // The expedition is keyed on the journey, not the level, so the states above outlive a level change
  // — and they're seeded from an `activeJourney` that can still describe the level the player just
  // left. `useJourneys()` is not a context, so the screen only learns the level they picked once the
  // store's subscribe callback fires, which is after mount. Re-seed during render (not in an effect)
  // so the stale state never reaches the DOM.
  const [seededForLevel, setSeededForLevel] = useState(levelNr)
  if (seededForLevel !== levelNr) {
    setSeededForLevel(levelNr)
    // A forward transition is finished the moment the level it was heading for arrives, and a revisit
    // moves levelNr *down* — where a surviving `transitionToLevel` would keep `startNextLevel` true
    // forever: the playable board flung to translateX(-200%) and the inert decorative one centred in
    // its place, with no way back short of leaving the journey.
    setTransitionToLevel(levelNr)
    setShowingInterior(restoringInterior)
    setLevelCompleted(false)
  }

  const transitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => transitionTimersRef.current.forEach(clearTimeout), [])
  // A queued transition step belongs to the level that scheduled it; once the level moves, firing it
  // would re-apply the animation the re-seed above just cleared.
  useEffect(() => {
    transitionTimersRef.current.forEach(clearTimeout)
    transitionTimersRef.current = []
  }, [levelNr])

  const scheduleTransition = useCallback((steps: Array<[delay: number, step: () => void]>) => {
    transitionTimersRef.current.forEach(clearTimeout)
    transitionTimersRef.current = steps.map(([delay, step]) => setTimeout(step, delay))
  }, [])

  const startNextLevel = transitionToLevel > levelNr

  const completeLevel = useCallback(() => {
    // The board underneath the interior is already known to be solved; don't replay the celebration.
    if (startNextLevel || showingInterior) return
    setLevelCompleted(true)
  }, [startNextLevel, showingInterior])

  const completionFinished = useCallback(() => {
    setLevelCompleted(false)
    if (hasInterior) {
      // Mark the interior open so re-entry skips the exterior board and drops straight into the site.
      setInteriorLevel(journeyId, levelNr)
      setShowingInterior(true)
      return
    }
    scheduleTransition([
      [1000, () => setTransitionToLevel(levelNr + 1)],
      [1995, () => onNextLevel?.()],
    ])
  }, [hasInterior, setInteriorLevel, journeyId, levelNr, onNextLevel, scheduleTransition])

  const interiorComplete = useCallback(() => {
    setInteriorLevel(journeyId, null)
    setShowingInterior(false)
    if (completionCount > 0) {
      // Revisit/explore: each pyramid is an isolated re-exploration — return to the map instead of
      // advancing to the next level or re-completing the journey.
      onClose?.()
      return
    }
    scheduleTransition([
      [300, () => setTransitionToLevel(levelNr + 1)],
      [2000, () => onNextLevel?.()],
    ])
  }, [setInteriorLevel, journeyId, completionCount, levelNr, onNextLevel, onClose, scheduleTransition])

  // Backing out of the interior returns to the map; interiorLevelNr stays set, so re-entry lands
  // straight back inside.
  const leaveInterior = useCallback(() => {
    setShowingInterior(false)
    onClose?.()
  }, [onClose])

  return {
    startNextLevel,
    levelCompleted,
    showingInterior,
    completeLevel,
    completionFinished,
    interiorComplete,
    leaveInterior,
  }
}
