import { useEffect, useMemo } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { journeys as journeyData, type Journey } from "@/data/journeys"
import { generateNewSeed } from "@/game/random"
import { persistentInteriorSeed } from "@/game/siteSeed"
import { useJourneyTranslations, type TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { hashString } from "@/support/hashString"
import { difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { keyOfAddress, sectionOfAddress, type CarveIndependentState } from "@/app/SiteMap/cellIdentity"

/** Bumped whenever a stored cell key changes shape. 2 named cells by their authored slot and floor
 * rather than by their step along the carved walk. 3 named their SECTION by its authoring address
 * (`main`, `s0`, `s0.1`) rather than by a structural hash, which moved whenever the floor's own carve
 * knobs were retuned. See migrateJourneyToCarveIndependent. */
export const CELL_KEY_VERSION = 3

export type StoredJourneyStateV3 = {
  journeyId: string

  levelNr: number

  completionCount: number
  active: boolean
  // keyed by sectionHash; cells explored in the site interior — persists across revisits
  // stale entries (section hash no longer in world) are silently ignored on apply
  exploredSections: Record<string, string[]>
  /** The same exploration, keyed `${floor}/${slot}` inside each section — what a cell IS, not where the
   *  carve put it (src/app/SiteMap/cellIdentity.ts). This is what the map restores from; the coordinates
   *  above are kept only as the archive the re-keying reads, and go with the re-carve. */
  exploredCells?: Record<string, string[]>
  /** Which translation of this save's per-cell collections is stored, so a change to the key format
   *  re-derives them from `exploredSections` instead of throwing a run away. Absent = coordinates only. */
  cellKeyVersion?: number
  position: string | null // "floor:row,col" or null (entrance) — the archive; positionKey is what is read
  /** Where the player stands, as a cell address (src/app/SiteMap/cellIdentity.ts). Null = entrance. */
  positionKey?: string | null
  interiorLevelNr: number | null // set when interior is open for a level; cleared on level advance
  // All three name cells by address — `${levelNr}:${sectionHash}#${floor}/${slot}` — so a
  // re-carve moves the cell and takes the entry with it. See migrateJourneyToCarveIndependent.
  disabledTraps?: string[] // cells where trapTool was spent to disarm the corridor
  skippedConsumables?: string[] // cells where inventory was full at collect time
  purchasedStock?: string[] // `${address}!${stockIndex}` of shop slots already bought
  // Corridor detector (§7.2, found = noticed via proximity): both keyed `${levelNr}:${sectionAddress}`.
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
  /** `address` is the cell read off the grid with `cellAddress` — it carries the authoring section the
   * entry is filed under. `sectionHash` and `cellId` only key the coordinate archive beside it. */
  markCellExplored: (sectionHash: string, cellId: string, address?: string | null) => void
  /** Saves whose per-cell collections predate the current key format — see useCarveIndependentBackfill. */
  journeysNeedingReKey: () => StoredJourneyStateV3[]
  setCarveIndependentState: (journeyId: string, state: CarveIndependentState) => void
  /** This level's exploration, by section: the cell keys the map restores from. */
  getExploredCells: (journeyId: string) => Record<string, string[]>
  updatePosition: (journeyId: string, address: string, nodeId: string) => void
  setInteriorLevel: (journeyId: string, levelNr: number | null) => void
  // Every one of these names a cell by its `${sectionHash}#${floor}/${slot}` address, which
  // the caller reads off the cell with `cellAddress`. The level is added here, as for exploration.
  markTrapDisabled: (address: string) => void
  markConsumableSkipped: (address: string) => void
  clearConsumableSkipped: (address: string) => void
  getSkippedConsumables: (journeyId: string) => ReadonlySet<string>
  markShopSlotPurchased: (address: string, stockIndex: number) => void
  getPurchasedShopSlots: (journeyId: string) => ReadonlySet<string>
  registerHiddenCorridors: (sectionAddresses: string[]) => void
  markCorridorFound: (sectionAddress: string) => void
  getFoundHiddenCorridors: (journeyId: string) => ReadonlySet<string>
  getOutstandingHiddenCorridorCount: (journeyId: string) => number
  registerFloorExploration: (
    journeyId: string,
    levelNr: number,
    floorIndex: number,
    open: boolean,
    keySets: string[][]
  ) => void
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

  /**
   * The level a write belongs to, read HERE — on the render that called — and never inside a
   * `setJourneys` updater.
   *
   * An updater runs a microtask after the call (`useOfflineStorage`'s setValue awaits its load promise
   * before applying), by which point `completeLevel`/`visitLevel` may have moved `levelNr` on. A key
   * built in there files the write under a level the player never opened. Everything below that keys by
   * level takes it from here instead; the one writer that outlives the level it describes — the floor
   * exploration recorder, which fires as the interior unmounts — is handed its level outright.
   */
  const levelOf = (journeyId: string | undefined) => journeys.find(j => j.journeyId === journeyId)?.levelNr ?? 1

  // Sites with an interior are persistent, revisitable places: the random seed must stay stable
  // across replays so a previously explored layout still matches on return. Tombs are one such
  // site — a single multi-floor place explored incrementally, never a reshuffled replay.
  const isPersistentInterior = (journey: Journey) => !!journey.siteConfigs?.length

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
                ? { ...j, active: true, levelNr: 1, position: null, positionKey: null, interiorLevelNr: null }
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
      // Born current: a journey started under this release has never been keyed any other way.
      cellKeyVersion: CELL_KEY_VERSION,
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
              positionKey: null,
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
            ? { ...j, active: true, levelNr: targetLevelNr, position: null, positionKey: null, interiorLevelNr: null }
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
        j.journeyId === activeJourneyId
          ? { ...j, levelNr: j.levelNr + 1, position: null, positionKey: null, interiorLevelNr: null }
          : j
      )
    )
  }

  const markCellExplored = (sectionHash: string, cellId: string, address?: string | null) => {
    if (!activeJourneyId) return
    const levelNr = levelOf(activeJourneyId)
    // Two keys, on purpose: exploration is filed by the section's AUTHORING address, the coordinate
    // archive beside it stays filed by the structural hash it was always written under, so a later
    // re-keying can still match it. Both go when the reshape drops the archive.
    const key = `${levelNr}:${sectionHash}`
    const cellKey = address ? keyOfAddress(address) : undefined
    const sectionKey = address ? `${levelNr}:${sectionOfAddress(address)}` : key
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const coordinates = j.exploredSections[key] ?? []
        const keys = j.exploredCells?.[sectionKey] ?? []
        const haveCoordinate = coordinates.includes(cellId)
        const haveKey = !cellKey || keys.includes(cellKey)
        if (haveCoordinate && haveKey) return j
        return {
          ...j,
          // The cell key is what the map restores from. The coordinate is written alongside it purely
          // as the archive a re-keying reads (see `cellKeyVersion`), and goes when the floors move.
          exploredSections: haveCoordinate
            ? j.exploredSections
            : { ...j.exploredSections, [key]: [...coordinates, cellId] },
          ...(cellKey && !haveKey
            ? { exploredCells: { ...(j.exploredCells ?? {}), [sectionKey]: [...keys, cellKey] } }
            : {}),
        }
      })
    )
  }

  // A save is behind whenever its per-cell collections were written under an older key format —
  // coordinates only (no `cellKeyVersion` at all), or keys written under an earlier shape of the key.
  // Every one of them is re-derived from `exploredSections`, which is why the coordinates are kept
  // until the re-carve: they are the archive this reads.
  //
  // A journey with nothing explored is picked up too, and translates to nothing. That is the point:
  // once this has run, EVERY save carries the current stamp, so `cellKeyVersion` is an exact record of
  // whether a save has been through this release — which is what the reshape reads to decide whether a
  // save can be carried across at all. A stamp that only landed on journeys with exploration would
  // read "never migrated" for a player who simply had not walked into a pyramid yet.
  const journeysNeedingReKey = () => journeys.filter(j => j.cellKeyVersion !== CELL_KEY_VERSION)

  const setCarveIndependentState = (journeyId: string, state: CarveIndependentState) => {
    setJourneys(prev =>
      prev.map(j => (j.journeyId === journeyId ? { ...j, ...state, cellKeyVersion: CELL_KEY_VERSION } : j))
    )
  }

  const getExploredCells = (journeyId: string): Record<string, string[]> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return {}
    const prefix = `${j.levelNr}:`
    const result: Record<string, string[]> = {}
    for (const [key, cells] of Object.entries(j.exploredCells ?? {})) {
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = cells
    }
    return result
  }

  // Both are written: the address is what the map reads, the coordinate is the archive the backfill
  // re-reads (see `exploredSections`), and both go stale together when the level changes.
  const updatePosition = (journeyId: string, address: string, nodeId: string) => {
    setJourneys(prev =>
      prev.map(j => (j.journeyId === journeyId ? { ...j, position: nodeId, positionKey: address } : j))
    )
  }

  const setInteriorLevel = (journeyId: string, levelNr: number | null) => {
    setJourneys(prev => prev.map(j => (j.journeyId === journeyId ? { ...j, interiorLevelNr: levelNr } : j)))
  }

  const maxDifficulty = journeys.reduce<Difficulty>((difficulty, item) => {
    const j = journeyData.find(j => j.id === item.journeyId)
    if (j && difficultyCompare(j.difficulty, difficulty) > 0) return j.difficulty
    return difficulty
  }, "starter")

  // The three cell collections below are stored level-first, the way exploration is, so a multi-level
  // pyramid keeps its levels apart. Callers pass a bare address and never see the prefix: these add it
  // on write, and the readers strip it back off for the level the journey is currently in.
  const atLevel = (address: string) => `${levelOf(activeJourneyId)}:${address}`

  const forThisLevel = (journeyId: string, entries: string[] | undefined): ReadonlySet<string> => {
    const j = journeys.find(j => j.journeyId === journeyId)
    if (!j) return new Set()
    const prefix = `${j.levelNr}:`
    return new Set((entries ?? []).filter(e => e.startsWith(prefix)).map(e => e.slice(prefix.length)))
  }

  const markTrapDisabled = (address: string) => {
    if (!activeJourneyId) return
    const key = atLevel(address)
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const traps = j.disabledTraps ?? []
        return traps.includes(key) ? j : { ...j, disabledTraps: [...traps, key] }
      })
    )
  }

  const markConsumableSkipped = (address: string) => {
    if (!activeJourneyId) return
    const key = atLevel(address)
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const skipped = j.skippedConsumables ?? []
        if (skipped.includes(key)) return j
        return { ...j, skippedConsumables: [...skipped, key] }
      })
    )
  }

  const clearConsumableSkipped = (address: string) => {
    if (!activeJourneyId) return
    const key = atLevel(address)
    setJourneys(prev =>
      prev.map(j =>
        j.journeyId === activeJourneyId
          ? { ...j, skippedConsumables: (j.skippedConsumables ?? []).filter(id => id !== key) }
          : j
      )
    )
  }

  const getSkippedConsumables = (journeyId: string): ReadonlySet<string> =>
    forThisLevel(journeyId, journeys.find(j => j.journeyId === journeyId)?.skippedConsumables)

  const markShopSlotPurchased = (address: string, stockIndex: number) => {
    if (!activeJourneyId) return
    // `!` and not `#`: the address already spends its `#` on the section it belongs to.
    const key = `${atLevel(address)}!${stockIndex}`
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const purchased = j.purchasedStock ?? []
        if (purchased.includes(key)) return j
        return { ...j, purchasedStock: [...purchased, key] }
      })
    )
  }

  const getPurchasedShopSlots = (journeyId: string): ReadonlySet<string> =>
    forThisLevel(journeyId, journeys.find(j => j.journeyId === journeyId)?.purchasedStock)

  // Corridor detector: hidden sections become "known" the moment the player views the floor
  // holding them; keyed by levelNr like exploration so a multi-level pyramid keeps them apart.
  const registerHiddenCorridors = (sectionAddresses: string[]) => {
    if (!activeJourneyId || sectionAddresses.length === 0) return
    const levelNr = levelOf(activeJourneyId)
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const known = j.knownHiddenCorridors ?? []
        const additions = sectionAddresses.map(a => `${levelNr}:${a}`).filter(key => !known.includes(key))
        if (additions.length === 0) return j // no churn: unchanged reference lets React bail
        return { ...j, knownHiddenCorridors: [...known, ...additions] }
      })
    )
  }

  const markCorridorFound = (sectionAddress: string) => {
    if (!activeJourneyId) return
    const key = `${levelOf(activeJourneyId)}:${sectionAddress}`
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== activeJourneyId) return j
        const found = j.foundHiddenCorridors ?? []
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

  const registerFloorExploration = (
    journeyId: string,
    levelNr: number,
    floorIndex: number,
    open: boolean,
    keySets: string[][]
  ) => {
    // Bail if the journey isn't in `journeys` yet, same as every other mutator here — most
    // commonly because this instance's storage load hasn't landed yet (`journeys` still `[]`
    // on mount). Without this check, a `.map` over that placeholder state silently no-ops the
    // update but still fires setJourneys, overwriting the real persisted data with `[]`.
    if (!journeys.some(j => j.journeyId === journeyId)) return
    setJourneys(prev =>
      prev.map(j => {
        if (j.journeyId !== journeyId) return j
        const key = `${levelNr}:${floorIndex}`
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
    // Only levels this journey still has a node for. A tomb's earliest runs filed floors under the
    // levels its exterior used to count, and it now re-enters level 1 from every node: those entries
    // are unreachable, and counting them left the journey card pulsing at a tomb with nothing left.
    const nodes = journeyData.find(info => info.id === journeyId)?.levelCount ?? 1
    for (const [key, entry] of Object.entries(j.floorExploration)) {
      const level = Number(key.split(":")[0])
      if (level > nodes) continue
      const lit = (entry.open ?? false) || (entry.keySets ?? []).some(ks => ks.every(k => heldKeys.has(k)))
      if (lit) levels.add(level)
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
    journeysNeedingReKey,
    setCarveIndependentState,
    getExploredCells,
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
