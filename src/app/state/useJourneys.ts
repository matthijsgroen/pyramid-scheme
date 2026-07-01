import { useEffect, useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { journeys as journeyData, type Journey } from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import { useJourneyTranslations, type TranslatedJourney } from "@/data/useJourneyTranslations"
import { hashString } from "@/support/hashString"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"

export type StoredJourneyStateV3 = {
  journeyId: string

  levelNr: number

  completionCount: number
  foundMapPiece: boolean
  active: boolean
  // keyed by sectionHash; cells explored in the site interior — persists across revisits
  // stale entries (section hash no longer in world) are silently ignored on apply
  exploredSections: Record<string, string[]>
  position: string | null // current node ID "floor:row,col" or null (entrance)
  interiorLevelNr: number | null // set when interior is open for a level; cleared on level advance
}

export type CombinedJourneyState = StoredJourneyStateV3 & {
  inProgress: boolean // derived: same as active, kept for Travel.tsx compatibility
  randomSeed: number
  progressPercentage: number
  journey: TranslatedJourney
}

export type JourneyAPI = {
  activeJourneyId: string | undefined
  maxDifficulty: Difficulty
  startJourney: (journey: Journey) => void
  visitLevel: (journeyId: string, levelNr: number) => void
  nextJourneySeed: (journeyId: string) => number
  getJourney: (journeyId: string) => CombinedJourneyState | undefined
  completeJourney: () => void
  cancelJourney: () => void
  completeLevel: () => void
  findMapPiece: () => void
  markCellExplored: (sectionHash: string, cellId: string) => void
  getExploredSections: (journeyId: string) => Record<string, string[]>
  updatePosition: (journeyId: string, nodeId: string) => void
  setInteriorLevel: (journeyId: string, levelNr: number | null) => void
}

const knownJourneyIds = journeyData.map(j => j.id)

export const useJourneys = (): JourneyAPI => {
  const [storageVersions, setStorageVersion, versionLoaded] = useGameStorage<{
    journeys: number
    inventory: number
    answers: number
  }>("storageVersions", {
    journeys: 3,
    inventory: 1,
    answers: 1,
  })
  const translatedJourneys = useJourneyTranslations()
  const [journeys, setJourneys] = useGameStorage<StoredJourneyStateV3[]>("journeys", [])

  useEffect(() => {
    if (versionLoaded && storageVersions.journeys !== 3) {
      // Hard reset on version mismatch — no migration from prior versions
      setStorageVersion(prev => ({ ...prev, journeys: 3 })).then(() => {
        setJourneys([])
      })
    }
  }, [setJourneys, setStorageVersion, storageVersions.journeys, versionLoaded])

  return useMemo(
    () => createJourneysV3Api({ journeys, setJourneys, journeyData: translatedJourneys }),
    [translatedJourneys, journeys, setJourneys]
  )
}

export const createJourneysV3Api = ({
  journeys,
  journeyData,
  setJourneys,
}: {
  journeys: StoredJourneyStateV3[]
  journeyData: TranslatedJourney[]
  setJourneys: (value: StoredJourneyStateV3[] | ((prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])) => void
}): JourneyAPI => {
  const activeJourneyId = journeys.find(j => j.active && knownJourneyIds.includes(j.journeyId))?.journeyId

  const getJourney = (journeyId: string): CombinedJourneyState | undefined => {
    const journeyState = journeys.find(j => j.journeyId === journeyId)
    if (!journeyState) return undefined
    const journeyInfo = journeyData.find((j): j is TranslatedJourney => j.id === journeyId)
    if (!journeyInfo) return undefined
    const progressPercentage = Math.min(((journeyState.levelNr ?? 1) - 1) / journeyInfo.levelCount, 1)
    return {
      ...journeyState,
      inProgress: journeyState.active,
      journey: journeyInfo,
      randomSeed: generateNewSeed(hashString(journeyId), journeyState.completionCount + 1),
      progressPercentage,
    }
  }

  const nextJourneySeed = (journeyId: string) => {
    const info = getJourney(journeyId)
    return generateNewSeed(hashString(journeyId), (info?.completionCount ?? 0) + 1)
  }

  const startJourney = (journey: Journey) => {
    const existing = journeys.find(j => j.journeyId === journey.id)
    if (existing) {
      setJourneys(prev => prev.map(j => (j.journeyId === journey.id ? { ...j, active: true } : j)))
      return
    }
    const newJourney: StoredJourneyStateV3 = {
      journeyId: journey.id,
      levelNr: 1,
      completionCount: 0,
      foundMapPiece: false,
      active: true,
      exploredSections: {},
      position: null,
      interiorLevelNr: null,
    }
    setJourneys(prev => [...prev, newJourney])
  }

  const completeJourney = () => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === activeJourneyId
          ? {
              ...j,
              active: false,
              completionCount: j.completionCount + 1,
              position: null,
              interiorLevelNr: null,
            }
          : j
      )
    )
  }

  const visitLevel = (journeyId: string, targetLevelNr: number) => {
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === journeyId
          ? { ...j, active: true, levelNr: targetLevelNr, position: null, interiorLevelNr: null }
          : j
      )
    )
  }

  const cancelJourney = () => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => (j.journeyId === activeJourneyId ? { ...j, active: false, interiorLevelNr: null } : j))
    )
  }

  const completeLevel = () => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === activeJourneyId ? { ...j, levelNr: j.levelNr + 1, position: null, interiorLevelNr: null } : j
      )
    )
  }

  const findMapPiece = () => {
    if (!activeJourneyId) return
    setJourneys(prev => prev.map(j => (j.journeyId === activeJourneyId ? { ...j, foundMapPiece: true } : j)))
  }

  const markCellExplored = (sectionHash: string, cellId: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const current = j.exploredSections[sectionHash] ?? []
        if (current.includes(cellId)) return j
        return { ...j, exploredSections: { ...j.exploredSections, [sectionHash]: [...current, cellId] } }
      })
    )
  }

  const getExploredSections = (journeyId: string): Record<string, string[]> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return {}
    return j.exploredSections
  }

  const updatePosition = (journeyId: string, nodeId: string) => {
    setJourneys(prev => prev.map(j => (j.journeyId === journeyId ? { ...j, position: nodeId } : j)))
  }

  const setInteriorLevel = (journeyId: string, levelNr: number | null) => {
    setJourneys(prev => prev.map(j => (j.journeyId === journeyId ? { ...j, interiorLevelNr: levelNr } : j)))
  }

  const maxDifficulty = journeys.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find(j => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) return j.difficulty
    return difficulty
  }, "starter")

  return {
    activeJourneyId,
    maxDifficulty,
    getJourney,
    nextJourneySeed,
    findMapPiece,
    startJourney,
    visitLevel,
    completeJourney,
    cancelJourney,
    completeLevel,
    markCellExplored,
    getExploredSections,
    updatePosition,
    setInteriorLevel,
  }
}
