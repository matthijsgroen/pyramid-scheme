import { useCallback, useMemo } from "react"
import type { ActiveJourney } from "../../game/generateJourney"
import { useGameStorage } from "../../support/useGameStorage"
import { startJourney as dataStartJourney } from "../../game/generateJourney"
import type { Journey } from "../../data/journeys"
import { generateNewSeed } from "../../game/random"
import { journeys as journeyData } from "../../data/journeys"

const baseJourneySeed = 987654321

export type JourneyState = ActiveJourney & {
  journey: Journey
}

export const useJourneys = (): {
  activeJourney: JourneyState | undefined
  journeyLog: JourneyState[]
  startJourney: (journey: Journey) => void
  completeJourney: () => void
  cancelJourney: () => void
  completeLevel: () => void
} => {
  const [journeys, setJourneys] = useGameStorage<ActiveJourney[]>(
    "journeys",
    []
  )

  const activeJourney = journeys.find((j) => !j.endTime)

  const startJourney = useCallback(
    (journey: Journey) => {
      const seed = generateNewSeed(baseJourneySeed, journeys.length + 1)
      const activeJourney = dataStartJourney(journey.id, seed)

      setJourneys((prev) => [...prev, activeJourney])
    },
    [setJourneys, journeys.length]
  )

  const finishJourney = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, completed: true, endTime: Date.now() }
          : j
      )
    )
  }, [activeJourney, setJourneys])

  const cancelJourney = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, canceled: true, endTime: Date.now() }
          : j
      )
    )
  }, [activeJourney, setJourneys])

  const completeLevel = useCallback(() => {
    if (!activeJourney) return
    console.log("Completing level", activeJourney.levelNr)

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, levelNr: j.levelNr + 1 }
          : j
      )
    )
  }, [activeJourney, setJourneys])

  const completeJourney = useMemo((): JourneyState | undefined => {
    const journey = journeyData.find((j) => j.id === activeJourney?.journeyId)
    if (!journey || !activeJourney) {
      return undefined
    }
    return { ...activeJourney, journey }
  }, [activeJourney])

  const journeyStates = useMemo(
    (): JourneyState[] =>
      journeys
        .map((journeyState) => {
          const journey = journeyData.find(
            (j) => j.id === journeyState.journeyId
          )
          if (!journey || !journeyState) {
            return undefined
          }
          return { ...journeyState, journey }
        })
        .filter(
          (journeyState): journeyState is JourneyState =>
            journeyState !== undefined
        ),
    [journeys]
  )

  return {
    activeJourney: completeJourney,
    journeyLog: journeyStates,
    startJourney,
    completeJourney: finishJourney,
    cancelJourney,
    completeLevel,
  }
}
