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

export type CombinedJourneyState = {
  journeyId: (typeof journeys)[number]["id"]
  randomSeed: number

  levelNr: number
  completionCount: number
  foundMapPiece: boolean
  inProgress: boolean
  active: boolean
  progressPercentage: number

  journey: TranslatedJourney
}

const journeyIds = journeyData.map((j) => j.id)

export const useJourneys = (): {
  activeJourneyId: string | undefined
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

  const finishJourney = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId
          ? { ...j, completed: true, canceled: false }
          : j
      )
    )
  }, [activeJourney, setJourneys])

  const cancelJourney = useCallback(() => {
    if (!activeJourney) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourney.journeyId ? { ...j, canceled: true } : j
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

  const maxDifficulty = journeys.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find((j) => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) {
      return j.difficulty
    }
    return difficulty
  }, "starter")

  const getJourney = useCallback(
    (journeyId: string): CombinedJourneyState | undefined => {
      // return journeyStates.find((j) => j.journeyId === journeyId)
      const journeyStates = journeys.filter((j) => j.journeyId === journeyId)
      if (journeyStates.length === 0) return undefined
      const journeyInfo = journeyData.find(
        (j): j is TranslatedJourney => j.id === journeyId
      )
      if (!journeyInfo) return undefined

      const journeyInProgress = journeys.find(
        (j) => !j.completed && j.journeyId === journeyId
      )
      const isActive = journeyStates.some((j) => !j.canceled && !j.completed)

      const progressPercentage = Math.min(
        ((journeyInProgress?.levelNr ?? 1) - 1) / journeyInfo.levelCount,
        1
      )
      const completionCount = journeyStates.filter((j) => j.completed).length

      return {
        journey: journeyInfo,
        journeyId,
        levelNr: journeyInProgress?.levelNr ?? 1,
        active: isActive,
        randomSeed:
          journeyInProgress?.randomSeed ??
          generateNewSeed(hashString(journeyId), completionCount + 1),
        inProgress: journeyInProgress ? true : false,
        progressPercentage,
        completionCount,
        foundMapPiece: journeys.some((j) => j.foundMapPiece),
      }
    },
    [journeyData, journeys]
  )

  const nextJourneySeed = useCallback(
    (journeyId: string) => {
      const info = getJourney(journeyId)
      return generateNewSeed(
        hashString(journeyId),
        (info?.completionCount ?? 0) + 1
      )
    },
    [getJourney]
  )

  const startJourney = useCallback(
    (journey: Journey) => {
      const journeyInfo = getJourney(journey.id)
      if (journeyInfo && journeyInfo.inProgress && !journeyInfo.active) {
        setJourneys((prev) =>
          prev.map<ActiveJourney>((j) =>
            j.journeyId === journey.id && j.canceled && !j.completed
              ? { ...j, completed: false, canceled: false }
              : j
          )
        )
        return
      }
      const seed = nextJourneySeed(journey.id)
      const activeJourney = dataStartJourney(journey.id, seed)

      setJourneys((prev) => [...prev, activeJourney])
    },
    [getJourney, nextJourneySeed, setJourneys]
  )

  return {
    activeJourneyId: activeJourney?.journeyId,
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
