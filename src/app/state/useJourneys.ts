import { useCallback, useMemo } from "react"
import type { ActiveJourney } from "@/game/generateJourneyLevel"
import { useGameStorage } from "@/support/useGameStorage"
import { startJourney as dataStartJourney } from "@/game/generateJourneyLevel"
import {
  journeys as journeyData,
  journeys,
  type Journey,
} from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import {
  useJourneyTranslations,
  type TranslatedJourney,
} from "@/data/useJourneyTranslations"
import { hashString } from "@/support/hashString"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"

export type JourneyState = ActiveJourney & {
  journey: TranslatedJourney
}

export type CombinedJourneyState = {
  journeyId: (typeof journeys)[number]["id"]
  randomSeed?: number

  levelNr: number | null
  completionCount: number
  foundMapPiece: boolean
  inProgress: boolean
  progressPercentage: number

  journey: TranslatedJourney
}

const getJourneyCompletionCount =
  (journeyLog: JourneyState[]) => (journeyId: string | undefined | null) => {
    if (!journeyId) return 0
    return journeyLog.filter((j) => j.journeyId === journeyId && j.completed)
      .length
  }

const journeySeedGenerator = (
  journeyId: string,
  journeyLog: JourneyState[]
): number => {
  const journeyRun = getJourneyCompletionCount(journeyLog)(journeyId) + 1
  return generateNewSeed(hashString(journeyId), journeyRun)
}

const journeyIds = journeyData.map((j) => j.id)

export const useJourneys = (): {
  activeJourney: JourneyState | undefined
  maxDifficulty: Difficulty
  startJourney: (journey: Journey) => void
  nextJourneySeed: (journeyId: string) => number
  getJourney: (journeyId: string) => CombinedJourneyState | undefined
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
    return journeys.find(
      (j) => !j.completed && !j.canceled && journeyIds.includes(j.journeyId)
    )
  }, [journeys])

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
  const nextJourneySeed = useCallback(
    (journeyId: string) => {
      return journeySeedGenerator(journeyId, journeyStates)
    },
    [journeyStates]
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

  const maxDifficulty = journeyStates.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find((j) => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) {
      return j.difficulty
    }
    return difficulty
  }, "starter")

  const getJourney = useCallback(
    (journeyId: string): CombinedJourneyState | undefined => {
      // return journeyStates.find((j) => j.journeyId === journeyId)
      const journeys = journeyStates.filter((j) => j.journeyId === journeyId)
      if (journeys.length === 0) return undefined
      const journeyInfo = journeyData.find(
        (j): j is TranslatedJourney => j.id === journeyId
      )
      if (!journeyInfo) return undefined

      const journeyInProgress = journeys.find(
        (j) => !j.completed && j.journeyId === journeyId
      )

      const progressPercentage = Math.min(
        ((journeyInProgress?.levelNr ?? 1) - 1) / journeyInfo.levelCount,
        1
      )

      return {
        journey: journeyInfo,
        journeyId,
        levelNr: journeyInProgress?.levelNr ?? null,
        randomSeed: journeyInProgress?.randomSeed,
        inProgress: journeyInProgress ? true : false,
        progressPercentage,
        completionCount: journeys.filter((j) => j.completed).length,
        foundMapPiece: journeys.some((j) => j.foundMapPiece),
      }
    },
    [journeyData, journeyStates]
  )

  return {
    activeJourney: completeJourney,
    maxDifficulty,
    getJourney,
    nextJourneySeed,
    findMapPiece,
    startJourney,
    completeJourney: finishJourney,
    cancelJourney,
    completeLevel,
  }
}
