import { useCallback, useMemo } from "react"
import type { ActiveJourney } from "@/game/generateJourney"
import { useGameStorage } from "@/support/useGameStorage"
import { startJourney as dataStartJourney } from "@/game/generateJourney"
import { journeys, type Journey } from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import {
  useJourneyTranslations,
  type TranslatedJourney,
} from "@/data/useJourneyTranslations"
import { hashString } from "@/support/hashString"

export type JourneyState = ActiveJourney & {
  journey: TranslatedJourney
}

export const journeySeedGenerator =
  (journeys: { journeyId: string; completed: boolean }[]) =>
  (journeyId: string): number => {
    const journeyRun = journeys.filter(
      (j) => j.journeyId === journeyId && j.completed
    ).length
    return generateNewSeed(hashString(journeyId), journeyRun + 1)
  }

const journeyIds = journeys.map((j) => j.id)

export const useJourneys = (): {
  activeJourney: JourneyState | undefined
  journeyLog: JourneyState[]
  startJourney: (journey: Journey) => void
  nextJourneySeed: (journeyId: string) => number
  completeJourney: () => void
  cancelJourney: () => void
  completeLevel: () => void
  findMapPiece: () => void
} => {
  const journeyData = useJourneyTranslations()
  const [journeys, setJourneys] = useGameStorage<ActiveJourney[]>(
    "journeys",
    []
  )

  const activeJourney = useMemo(() => {
    return journeys.find((j) => !j.endTime && journeyIds.includes(j.journeyId))
  }, [journeys])

  const nextJourneySeed = useCallback(
    (journeyId: string) => {
      const generateNewSeed = journeySeedGenerator(journeys)
      return generateNewSeed(journeyId)
    },
    [journeys]
  )

  const startJourney = useCallback(
    (journey: Journey) => {
      const canceledJourney = journeys.find(
        (j) => j.journeyId === journey.id && j.canceled && !j.completed
      )
      if (canceledJourney) {
        setJourneys((prev) =>
          prev.map((j) =>
            j.journeyId === journey.id && j.canceled && !j.completed
              ? { ...j, completed: false, canceled: false, endTime: 0 }
              : j
          )
        )
        return
      }
      const seed = nextJourneySeed(journey.id)
      const activeJourney = dataStartJourney(journey.id, seed)

      setJourneys((prev) => [...prev, activeJourney])
    },
    [setJourneys, nextJourneySeed, journeys]
  )

  const finishJourney = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, completed: true, canceled: false, endTime: Date.now() }
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
  }, [activeJourney, journeyData])

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
    [journeys, journeyData]
  )

  const findMapPiece = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, foundMapPiece: true }
          : j
      )
    )
  }, [activeJourney, setJourneys])

  return {
    activeJourney: completeJourney,
    journeyLog: journeyStates,
    nextJourneySeed,
    findMapPiece,
    startJourney,
    completeJourney: finishJourney,
    cancelJourney,
    completeLevel,
  }
}
