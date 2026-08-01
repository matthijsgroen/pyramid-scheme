import { useEffect, useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { journeys as journeyData, type Journey } from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import { persistentInteriorSeed } from "@/game/siteSeed"
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
  // Per-floor "still stuff to find here" summary, keyed `${levelNr}:${floorIndex}`, recomputed each
  // time a floor is viewed (the grid is assembled there, so it's cheap — the travel screen has only
  // configs and must not re-assemble). `open` = ungated unvisited content the player can just walk
  // to. `keySets` = key bundles for gated content (a tomb-key ward door, a tableau's hieroglyphs, …);
  // a bundle lights this floor once ALL its keys are held. Stored (not resolved here) so the travel
  // screen re-checks against the CURRENTLY-held keys — a newly-earned key lights a pyramid the player
  // already left, no re-assembly. Keys are opaque ids (mod-owned); this names no mod.
  floorExploration?: Record<string, { open: boolean; keySets: string[][] }>
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
  // Both resolve once the write is persisted. Callers that immediately show the expedition must
  // await them: `useJourneys()` is not a context, so every other instance only learns the new
  // levelNr through the store's subscribe callback, which fires after the write lands. Mounting
  // PyramidExpedition before that leaves it seeded with the level the player just left.
  startJourney: (journey: Journey) => Promise<unknown>
  visitLevel: (journeyId: string, levelNr: number) => Promise<unknown>
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
  registerFloorExploration: (journeyId: string, floorIndex: number, open: boolean, keySets: string[][]) => void
  // 1-based levelNrs of this journey's pyramids that still hold unvisited content given the passed
  // held keys — ungated content, or gated content whose full key bundle the player now holds (a ward
  // door's key, a tableau's hieroglyphs, …). Empty set = nothing to go back for. Read cheaply on the
  // travel screen from the persisted floorExploration summary; names no mod (keys are opaque ids).
  getUnexploredLevels: (journeyId: string, heldKeys: ReadonlySet<string>) => ReadonlySet<number>
}

const knownJourneyIds = journeyData.map(j => j.id)

// Module constants, not inline literals: a fresh literal on every render makes every consumer of
// useOfflineStorage look like a different default to anything comparing by identity.
const INITIAL_STORAGE_VERSIONS = { journeys: 3, inventory: 1, answers: 1 }
const NO_JOURNEYS: StoredJourneyStateV3[] = []

export const useJourneys = (): JourneyAPI => {
  const [storageVersions, setStorageVersion, versionLoaded] = useGameStorage<{
    journeys: number
    inventory: number
    answers: number
  }>("storageVersions", INITIAL_STORAGE_VERSIONS)
  const translatedJourneys = useJourneyTranslations()
  const [journeys, setJourneys] = useGameStorage<StoredJourneyStateV3[]>("journeys", NO_JOURNEYS)

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
  setJourneys: (
    value: StoredJourneyStateV3[] | ((prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])
  ) => Promise<unknown> | void
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
      ? persistentInteriorSeed(journeyId)
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
      return Promise.resolve(
        setJourneys(prev =>
          prev.map(j =>
            j.journeyId === journey.id
              ? alreadyCompletedRun
                ? { ...j, active: true, levelNr: 1, position: null, interiorLevelNr: null }
                : { ...j, active: true }
              : j
          )
        )
      )
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
    return Promise.resolve(setJourneys(prev => [...prev, newJourney]))
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

  const visitLevel = (journeyId: string, targetLevelNr: number) =>
    Promise.resolve(
      setJourneys(prev =>
        prev.map(j =>
          j.journeyId === journeyId
            ? { ...j, active: true, levelNr: targetLevelNr, position: null, interiorLevelNr: null }
            : j
        )
      )
    )

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

  // `?? []` / `?? false` tolerate a floorExploration entry saved by an earlier build with a
  // different shape (the field is loose persisted data, like exploredSections — stale/foreign
  // entries are ignored, not migrated, and never crash). A pre-shape entry simply reads as "nothing
  // here" until its floor is re-entered and re-recorded.
  const sig = (o: boolean | undefined, ks: string[][] | undefined) =>
    `${o ?? false}|${(ks ?? []).map(k => k.join(",")).join(";")}`

  const registerFloorExploration = (journeyId: string, floorIndex: number, open: boolean, keySets: string[][]) => {
    // Bail if the journey isn't in `journeys` yet, same as every other mutator here — most
    // commonly because this instance's storage load hasn't landed yet (`journeys` still `[]`
    // on mount). Without this check, a `.map` over that placeholder state silently no-ops the
    // update but still fires setJourneys, overwriting the real persisted data with `[]`.
    if (!journeys.some(j => j.journeyId === journeyId)) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== journeyId) return j
        const key = `${j.levelNr}:${floorIndex}`
        const prevEntry = j.floorExploration?.[key]
        // No churn: identical summary lets React bail (the effect that calls this fires every render).
        if (prevEntry && sig(prevEntry.open, prevEntry.keySets) === sig(open, keySets)) return j
        return { ...j, floorExploration: { ...j.floorExploration, [key]: { open, keySets } } }
      })
    )
  }

  const getUnexploredLevels = (journeyId: string, heldKeys: ReadonlySet<string>): ReadonlySet<number> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    const levels = new Set<number>()
    if (!j?.floorExploration) return levels
    for (const [key, entry] of Object.entries(j.floorExploration)) {
      const lit = (entry.open ?? false) || (entry.keySets ?? []).some(ks => ks.every(k => heldKeys.has(k)))
      if (lit) levels.add(Number(key.split(":")[0]))
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
