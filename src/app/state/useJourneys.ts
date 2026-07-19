import { useEffect, useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { journeys as journeyData, type Journey } from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import { useJourneyTranslations, type TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { hashString } from "@/support/hashString"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"

export type StoredJourneyStateV3 = {
  journeyId: string

  levelNr: number

  completionCount: number
  active: boolean
  // keyed by sectionHash; cells explored in the site interior — persists across revisits
  // stale entries (section hash no longer in world) are silently ignored on apply
  exploredSections: Record<string, string[]>
  position: string | null // current node ID "floor:row,col" or null (entrance)
  interiorLevelNr: number | null // set when interior is open for a level; cleared on level advance
  disabledTraps?: string[] // edgeIds where trapTool was spent to disarm the corridor
  skippedConsumables?: string[] // edgeIds where inventory was full at collect time
  purchasedStock?: string[] // `${edgeId}#${stockIndex}` of shop slots already bought
  // Corridor detector (§7.2, found = noticed via proximity): both keyed `${levelNr}:${sectionHash}`.
  // `known` = hidden corridors on floors the player has viewed; `found` = ones the detector stopped
  // them at. Outstanding (known \ found) drives the L3 pyramid + L4 travel "unexplored corridor" markers.
  knownHiddenCorridors?: string[]
  foundHiddenCorridors?: string[]
  // Per-floor exploration summary, keyed `${levelNr}:${floorIndex}`, recomputed each time a floor
  // is viewed (the grid is assembled there, so it's cheap — the travel screen has only configs and
  // must not re-assemble). `openable` = a reachable, not-yet-completed node exists on the floor (a
  // skipped side path, a partly-explored section, a chest/puzzle/corridor you can walk to now).
  // `wardKeys` = tomb-key doors on the floor not yet opened; stored so the travel screen can re-check
  // them against the CURRENTLY-held keys — a newly-earned ward key lights up a pyramid the player
  // already left, with no re-assembly. Drives the Travel "unexplored here" marker.
  floorExploration?: Record<string, { openable: boolean; wardKeys: string[] }>
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
  markCellExplored: (sectionHash: string, cellId: string) => void
  getExploredSections: (journeyId: string) => Record<string, string[]>
  updatePosition: (journeyId: string, nodeId: string) => void
  setInteriorLevel: (journeyId: string, levelNr: number | null) => void
  markTrapDisabled: (sectionHash: string, edgeId: string) => void
  markConsumableSkipped: (edgeId: string) => void
  clearConsumableSkipped: (edgeId: string) => void
  getSkippedConsumables: (journeyId: string) => ReadonlySet<string>
  markShopSlotPurchased: (edgeId: string, stockIndex: number) => void
  getPurchasedShopSlots: (journeyId: string) => ReadonlySet<string>
  registerHiddenCorridors: (sectionHashes: string[]) => void
  markCorridorFound: (sectionHash: string) => void
  getFoundHiddenCorridors: (journeyId: string) => ReadonlySet<string>
  getOutstandingHiddenCorridorCount: (journeyId: string) => number
  registerFloorExploration: (floorIndex: number, openable: boolean, wardKeys: string[]) => void
  // 1-based levelNrs of this journey's pyramids that still hold reachable, unexplored content given
  // the passed held keys (a skipped node, or a ward door a now-held key opens). Empty set = nothing
  // to go back for. Read cheaply on the travel screen from the persisted floorExploration summary.
  getUnexploredLevels: (journeyId: string, heldKeys: ReadonlySet<string>) => ReadonlySet<number>
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

  // Sites with an interior are persistent, revisitable places: the random seed must stay stable
  // across replays so a previously explored layout still matches on return. Tombs are one such
  // site — a single multi-floor place explored incrementally, never a reshuffled replay.
  const isPersistentInterior = (journey: Journey) =>
    (journey.type === "pyramid" || journey.type === "treasure_tomb") && !!journey.siteConfigs?.length

  const getJourney = (journeyId: string): CombinedJourneyState | undefined => {
    const journeyState = journeys.find(j => j.journeyId === journeyId)
    if (!journeyState) return undefined
    const journeyInfo = journeyData.find((j): j is TranslatedJourney => j.id === journeyId)
    if (!journeyInfo) return undefined
    const progressPercentage = Math.min(((journeyState.levelNr ?? 1) - 1) / journeyInfo.levelCount, 1)
    // Persistent interiors (pyramids and tombs) are revisitable sites — their seed must never
    // move, or a completed run's exploredSections stop matching the (now different) layout.
    const randomSeed = isPersistentInterior(journeyInfo)
      ? generateNewSeed(hashString(journeyId), 1)
      : generateNewSeed(hashString(journeyId), journeyState.completionCount + 1)
    return {
      ...journeyState,
      inProgress: journeyState.active,
      journey: journeyInfo,
      randomSeed,
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
      const alreadyCompletedRun = isPersistentInterior(journey) && existing.levelNr > journey.levelCount
      setJourneys(prev =>
        prev.map(j =>
          j.journeyId === journey.id
            ? alreadyCompletedRun
              ? { ...j, active: true, levelNr: 1, position: null, interiorLevelNr: null }
              : { ...j, active: true }
            : j
        )
      )
      return
    }
    const newJourney: StoredJourneyStateV3 = {
      journeyId: journey.id,
      levelNr: 1,
      completionCount: 0,
      active: true,
      exploredSections: {},
      position: null,
      interiorLevelNr: null,
    }
    setJourneys(prev => [...prev, newJourney])
  }

  const completeJourney = () => {
    if (!activeJourneyId) return
    const journey = journeyData.find(j => j.id === activeJourneyId)
    // Persistent interiors don't re-randomize on replay, so completing one again shouldn't bump
    // the count past 1 — it only ever means "first time" once the site itself is revisitable.
    const capCompletionCount = journey && isPersistentInterior(journey)
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === activeJourneyId
          ? {
              ...j,
              active: false,
              completionCount: capCompletionCount ? Math.max(j.completionCount, 1) : j.completionCount + 1,
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

  const markCellExplored = (sectionHash: string, cellId: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const key = `${j.levelNr}:${sectionHash}`
        const current = j.exploredSections[key] ?? []
        if (current.includes(cellId)) return j
        return { ...j, exploredSections: { ...j.exploredSections, [key]: [...current, cellId] } }
      })
    )
  }

  const getExploredSections = (journeyId: string): Record<string, string[]> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return {}
    const prefix = `${j.levelNr}:`
    const result: Record<string, string[]> = {}
    for (const [key, cells] of Object.entries(j.exploredSections)) {
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = cells
    }
    return result
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

  const markTrapDisabled = (sectionHash: string, edgeId: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const traps = j.disabledTraps ?? []
        if (traps.includes(edgeId)) return j
        const key = `${j.levelNr}:${sectionHash}`
        const current = j.exploredSections[key] ?? []
        return {
          ...j,
          disabledTraps: [...traps, edgeId],
          exploredSections: current.includes(edgeId)
            ? j.exploredSections
            : { ...j.exploredSections, [key]: [...current, edgeId] },
        }
      })
    )
  }

  const markConsumableSkipped = (edgeId: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const skipped = j.skippedConsumables ?? []
        if (skipped.includes(edgeId)) return j
        return { ...j, skippedConsumables: [...skipped, edgeId] }
      })
    )
  }

  const clearConsumableSkipped = (edgeId: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === activeJourneyId
          ? { ...j, skippedConsumables: (j.skippedConsumables ?? []).filter(id => id !== edgeId) }
          : j
      )
    )
  }

  const getSkippedConsumables = (journeyId: string): ReadonlySet<string> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    return new Set(j?.skippedConsumables ?? [])
  }

  const markShopSlotPurchased = (edgeId: string, stockIndex: number) => {
    if (!activeJourneyId) return
    const key = `${edgeId}#${stockIndex}`
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const purchased = j.purchasedStock ?? []
        if (purchased.includes(key)) return j
        return { ...j, purchasedStock: [...purchased, key] }
      })
    )
  }

  const getPurchasedShopSlots = (journeyId: string): ReadonlySet<string> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    return new Set(j?.purchasedStock ?? [])
  }

  // Corridor detector: hidden sections become "known" the moment the player views the floor
  // holding them; keyed by levelNr like exploredSections so a multi-level pyramid keeps them apart.
  const registerHiddenCorridors = (sectionHashes: string[]) => {
    if (!activeJourneyId || sectionHashes.length === 0) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const known = j.knownHiddenCorridors ?? []
        const additions = sectionHashes.map(h => `${j.levelNr}:${h}`).filter(key => !known.includes(key))
        if (additions.length === 0) return j // no churn: unchanged reference lets React bail
        return { ...j, knownHiddenCorridors: [...known, ...additions] }
      })
    )
  }

  const markCorridorFound = (sectionHash: string) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const found = j.foundHiddenCorridors ?? []
        const key = `${j.levelNr}:${sectionHash}`
        if (found.includes(key)) return j
        return { ...j, foundHiddenCorridors: [...found, key] }
      })
    )
  }

  const getFoundHiddenCorridors = (journeyId: string): ReadonlySet<string> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return new Set()
    const prefix = `${j.levelNr}:`
    return new Set((j.foundHiddenCorridors ?? []).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)))
  }

  const getOutstandingHiddenCorridorCount = (journeyId: string): number => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return 0
    const found = new Set(j.foundHiddenCorridors ?? [])
    return (j.knownHiddenCorridors ?? []).filter(key => !found.has(key)).length
  }

  const registerFloorExploration = (floorIndex: number, openable: boolean, wardKeys: string[]) => {
    if (!activeJourneyId) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const key = `${j.levelNr}:${floorIndex}`
        const sorted = [...wardKeys].sort()
        const prevEntry = j.floorExploration?.[key]
        // No churn: identical summary lets React bail (the effect that calls this fires every render).
        if (prevEntry && prevEntry.openable === openable && prevEntry.wardKeys.join(",") === sorted.join(",")) return j
        return { ...j, floorExploration: { ...j.floorExploration, [key]: { openable, wardKeys: sorted } } }
      })
    )
  }

  const getUnexploredLevels = (journeyId: string, heldKeys: ReadonlySet<string>): ReadonlySet<number> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    const levels = new Set<number>()
    if (!j?.floorExploration) return levels
    for (const [key, entry] of Object.entries(j.floorExploration)) {
      if (!entry.openable && !entry.wardKeys.some(k => heldKeys.has(k))) continue
      levels.add(Number(key.split(":")[0]))
    }
    return levels
  }

  return {
    activeJourneyId,
    maxDifficulty,
    getJourney,
    nextJourneySeed,
    startJourney,
    visitLevel,
    completeJourney,
    cancelJourney,
    completeLevel,
    markCellExplored,
    getExploredSections,
    updatePosition,
    setInteriorLevel,
    markTrapDisabled,
    markConsumableSkipped,
    clearConsumableSkipped,
    getSkippedConsumables,
    markShopSlotPurchased,
    getPurchasedShopSlots,
    registerHiddenCorridors,
    markCorridorFound,
    getFoundHiddenCorridors,
    getOutstandingHiddenCorridorCount,
    registerFloorExploration,
    getUnexploredLevels,
  }
}
