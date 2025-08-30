import { useEffect, useMemo, type SetStateAction } from "react"
import { useGameStorage } from "@/support/useGameStorage"
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

export type StoredJourneyStateV1 = {
  journeyId: (typeof journeys)[number]["id"]
  randomSeed: number

  levelNr: number

  completed: boolean
  foundMapPiece?: boolean
  canceled?: boolean
}

export type StoredJourneyStateV2 = {
  journeyId: (typeof journeys)[number]["id"]

  levelNr: number

  completionCount: number
  foundMapPiece: boolean
  inProgress: boolean
  active: boolean
}

export type CombinedJourneyState = StoredJourneyStateV2 & {
  randomSeed: number
  progressPercentage: number

  journey: TranslatedJourney
}

export type JourneyAPI = {
  activeJourneyId: string | undefined
  maxDifficulty: Difficulty
  startJourney: (journey: Journey) => void
  nextJourneySeed: (journeyId: string) => number
  getJourney: (journeyId: string) => CombinedJourneyState | undefined
  completeJourney: () => void
  cancelJourney: () => void
  completeLevel: () => void
  findMapPiece: () => void
}

const journeyIds = journeyData.map((j) => j.id)

export const useJourneys = (): JourneyAPI => {
  const [storageVersions, setStorageVersion, versionLoaded] = useGameStorage<{
    journeys: number
    inventory: number
    answers: number
  }>("storageVersions", {
    journeys: 1,
    inventory: 1,
    answers: 1,
  })
  const journeyData = useJourneyTranslations()
  const [journeys, setJourneys] = useGameStorage<
    StoredJourneyStateV1[] | StoredJourneyStateV2[]
  >("journeys", [])

  useEffect(() => {
    if (versionLoaded && storageVersions.journeys === 1) {
      const updatedJourneys = migrateJourneys(
        journeys as StoredJourneyStateV1[]
      )
      setStorageVersion((prev) => ({ ...prev, journeys: 2 })).then(() => {
        setJourneys(updatedJourneys)
      })
    }
  }, [
    journeys,
    setJourneys,
    setStorageVersion,
    storageVersions.journeys,
    versionLoaded,
  ])

  return useMemo(
    () =>
      storageVersions.journeys === 1
        ? createJourneysV1Api({ journeys, setJourneys, journeyData } as {
            journeys: StoredJourneyStateV1[]
            journeyData: TranslatedJourney[]
            setJourneys: (
              value: SetStateAction<StoredJourneyStateV1[]>
            ) => Promise<StoredJourneyStateV1[] | StoredJourneyStateV2[]>
          })
        : createJourneysV2Api({ journeys, setJourneys, journeyData } as {
            journeys: StoredJourneyStateV2[]
            journeyData: TranslatedJourney[]
            setJourneys: (
              value: SetStateAction<StoredJourneyStateV2[]>
            ) => Promise<StoredJourneyStateV1[] | StoredJourneyStateV2[]>
          }),
    [journeyData, journeys, setJourneys, storageVersions.journeys]
  )
}

const getJourneyV1 = (
  journeys: StoredJourneyStateV1[],
  journeyId: string
): StoredJourneyStateV2 | undefined => {
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

  const completionCount = journeyStates.filter((j) => j.completed).length

  return {
    journeyId,
    levelNr: journeyInProgress?.levelNr ?? 1,
    active: isActive,
    inProgress: journeyInProgress ? true : false,
    completionCount,
    foundMapPiece: journeys.some((j) => j.foundMapPiece),
  }
}

export const createJourneysV1Api = ({
  journeys,
  journeyData,
  setJourneys,
}: {
  journeys: StoredJourneyStateV1[]
  journeyData: TranslatedJourney[]
  setJourneys: (
    value: SetStateAction<StoredJourneyStateV1[]>
  ) => Promise<StoredJourneyStateV1[] | StoredJourneyStateV2[]>
}): JourneyAPI => {
  const activeJourneyId = journeys.find(
    (j) => !j.completed && !j.canceled && journeyIds.includes(j.journeyId)
  )?.journeyId

  const finishJourney = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId
          ? { ...j, completed: true, canceled: false }
          : j
      )
    )
  }

  const cancelJourney = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, canceled: true } : j
      )
    )
  }

  const completeLevel = () => {
    if (!activeJourneyId) return
    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, levelNr: j.levelNr + 1 } : j
      )
    )
  }

  const findMapPiece = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, foundMapPiece: true } : j
      )
    )
  }

  const maxDifficulty = journeys.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find((j) => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) {
      return j.difficulty
    }
    return difficulty
  }, "starter")

  const getJourney = (journeyId: string): CombinedJourneyState | undefined => {
    const journeyInfo = journeyData.find(
      (j): j is TranslatedJourney => j.id === journeyId
    )
    if (!journeyInfo) return undefined
    const j = getJourneyV1(journeys, journeyId)
    if (!j) return undefined
    const progressPercentage = Math.min(
      ((j.levelNr ?? 1) - 1) / journeyInfo.levelCount,
      1
    )
    return {
      ...j,
      journey: journeyInfo,
      progressPercentage,
      randomSeed: generateNewSeed(hashString(journeyId), j.completionCount + 1),
    }
  }

  const nextJourneySeed = (journeyId: string) => {
    const info = getJourney(journeyId)
    return generateNewSeed(
      hashString(journeyId),
      (info?.completionCount ?? 0) + 1
    )
  }

  const startJourney = (journey: Journey) => {
    const journeyInfo = getJourney(journey.id)
    if (journeyInfo && journeyInfo.inProgress && !journeyInfo.active) {
      setJourneys((prev) =>
        prev.map((j) =>
          j.journeyId === journey.id && j.canceled && !j.completed
            ? { ...j, completed: false, canceled: false }
            : j
        )
      )
      return
    }
    const seed = nextJourneySeed(journey.id)
    const activeJourney = {
      journeyId: journey.id,
      randomSeed: seed,
      levelNr: 1,
      completed: false,
    }

    setJourneys((prev) => [...prev, activeJourney])
  }

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

export const createJourneysV2Api = ({
  journeys,
  journeyData,
  setJourneys,
}: {
  journeys: StoredJourneyStateV2[]
  journeyData: TranslatedJourney[]
  setJourneys: (
    value: SetStateAction<StoredJourneyStateV2[]>
  ) => Promise<StoredJourneyStateV1[] | StoredJourneyStateV2[]>
}): JourneyAPI => {
  const activeJourneyId = journeys.find(
    (j) => j.active && journeyIds.includes(j.journeyId)
  )?.journeyId

  const finishJourney = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId
          ? ({
              ...j,
              active: false,
              completionCount: j.completionCount + 1,
              inProgress: false,
              levelNr: 1,
            } satisfies StoredJourneyStateV2)
          : j
      )
    )
  }

  const cancelJourney = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, active: false } : j
      )
    )
  }

  const completeLevel = () => {
    if (!activeJourneyId) return
    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId
          ? {
              ...j,
              levelNr: j.levelNr + 1,
            }
          : j
      )
    )
  }

  const findMapPiece = () => {
    if (!activeJourneyId) return

    setJourneys((prev) =>
      prev.map((j) =>
        j.journeyId === activeJourneyId ? { ...j, foundMapPiece: true } : j
      )
    )
  }

  const maxDifficulty = journeys.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find((j) => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) {
      return j.difficulty
    }
    return difficulty
  }, "starter")

  const getJourney = (journeyId: string): CombinedJourneyState | undefined => {
    const journeyState = journeys.find((j) => j.journeyId === journeyId)
    if (!journeyState) return undefined
    const journeyInfo = journeyData.find(
      (j): j is TranslatedJourney => j.id === journeyId
    )
    if (!journeyInfo) return undefined

    const progressPercentage = Math.min(
      ((journeyState.levelNr ?? 1) - 1) / journeyInfo.levelCount,
      1
    )
    return {
      ...journeyState,
      journey: journeyInfo,
      randomSeed: generateNewSeed(
        hashString(journeyId),
        journeyState.completionCount + 1
      ),
      progressPercentage,
    }
  }

  const nextJourneySeed = (journeyId: string) => {
    const info = getJourney(journeyId)
    return generateNewSeed(
      hashString(journeyId),
      (info?.completionCount ?? 0) + 1
    )
  }

  const startJourney = (journey: Journey) => {
    const journeyInfo = getJourney(journey.id)

    if (journeyInfo && journeyInfo.inProgress && !journeyInfo.active) {
      setJourneys((prev) =>
        prev.map((j) =>
          j.journeyId === journey.id ? { ...j, active: true } : j
        )
      )
      return
    }
    const activeJourney: StoredJourneyStateV2 = {
      journeyId: journey.id,
      levelNr: 1,
      completionCount: journeyInfo?.completionCount ?? 0,
      foundMapPiece: journeyInfo?.foundMapPiece ?? false,

      inProgress: true,
      active: true,
    }

    setJourneys((prev) => {
      return [...prev.filter((j) => j.journeyId !== journey.id), activeJourney]
    })
  }

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

const migrateJourneys = (
  journeys: StoredJourneyStateV1[]
): StoredJourneyStateV2[] => {
  const journeyIds = journeys
    .map((j) => j.journeyId)
    .filter((v, i, a) => a.indexOf(v) === i)

  return journeyIds
    .map((id) => getJourneyV1(journeys, id))
    .filter((j): j is CombinedJourneyState => !!j)
}
