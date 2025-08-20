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
  const [unCastedJourneys, setJourneys, journeysLoaded] = useGameStorage<
    (ActiveJourney | CombinedJourneyState)[]
  >("journeys", [])
  const [storageVersions, _setStorageVersion, versionLoaded] = useGameStorage<{
    journeys: number
    inventory: number
    answers: number
  }>("storageVersions", {
    journeys: 1,
    inventory: 1,
    answers: 1,
  })

  const activeJourneys: ActiveJourney[] = useMemo(() => {
    if (versionLoaded && journeysLoaded && storageVersions.journeys === 1) {
      return unCastedJourneys as ActiveJourney[]
    }
    return []
  }, [unCastedJourneys, versionLoaded, journeysLoaded, storageVersions])

  const combinedJourneys: CombinedJourneyState[] = useMemo(() => {
    if (versionLoaded && journeysLoaded && storageVersions.journeys === 2) {
      return unCastedJourneys as CombinedJourneyState[]
    }
    return []
  }, [unCastedJourneys, versionLoaded, journeysLoaded, storageVersions])

  const activeJourneyId = useMemo(() => {
    if (storageVersions.journeys === 1) {
      return activeJourneys.find(
        (j) => !j.completed && !j.canceled && journeyIds.includes(j.journeyId)
      )?.journeyId
    }
    if (storageVersions.journeys === 2) {
      return combinedJourneys.find((j) => !j.active)?.journeyId
    }
  }, [activeJourneys, combinedJourneys, storageVersions])

  const finishJourney = useCallback(() => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId
          ? { ...j, completed: true, canceled: false }
          : j
      )
    )
  }, [activeJourneyId, setJourneys])

  const cancelJourney = useCallback(() => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, canceled: true } : j
      )
    )
  }, [activeJourneyId, setJourneys])

  const completeLevel = useCallback(() => {
    if (!activeJourneyId) return
    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, levelNr: j.levelNr + 1 } : j
      )
    )
  }, [activeJourneyId, setJourneys])

  const findMapPiece = useCallback(() => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, foundMapPiece: true } : j
      )
    )
  }, [activeJourneyId, setJourneys])

  const maxDifficulty = activeJourneys.reduce<Difficulty>(
    (difficulty, item) => {
      const j = journeyData.find((j) => j.id === item.journeyId)
      if (j && difficultyCompare(j.difficulty, difficulty) > 0) {
        return j.difficulty
      }
      return difficulty
    },
    "starter"
  )

  const getJourney = useCallback(
    (journeyId: string): CombinedJourneyState | undefined => {
      // return journeyStates.find((j) => j.journeyId === journeyId)
      const journeyStates = activeJourneys.filter(
        (j) => j.journeyId === journeyId
      )
      if (journeyStates.length === 0) return undefined
      const journeyInfo = journeyData.find(
        (j): j is TranslatedJourney => j.id === journeyId
      )
      if (!journeyInfo) return undefined

      const journeyInProgress = activeJourneys.find(
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
        foundMapPiece: activeJourneys.some((j) => j.foundMapPiece),
      }
    },
    [journeyData, activeJourneys]
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
          (prev as ActiveJourney[]).map<ActiveJourney>((j) =>
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
    activeJourneyId,
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
