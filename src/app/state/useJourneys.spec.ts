import { describe, expect, it, vi } from "vitest"
import { createJourneysV3Api, type StoredJourneyStateV3 } from "./useJourneys"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"
import { journeys as allJourneys } from "@/data/journeys"

// completeJourney checks against knownJourneyIds (the real journey list), so we
// need a real journey ID — use the first pyramid entry from the data.
const REAL_ID = allJourneys.find(j => j.type === "pyramid")!.id
const REAL_LEVEL_COUNT = allJourneys.find(j => j.type === "pyramid")!.levelCount

// Minimal journey stub — only fields createJourneysV3Api reads
const makeJourneyData = (id: string, levelCount = REAL_LEVEL_COUNT): TranslatedJourney =>
  ({
    id,
    type: "pyramid",
    difficulty: "starter",
    levelCount,
    journeyLength: "short",
    name: id,
    lengthLabel: "short",
  }) as TranslatedJourney

const makeStoredJourney = (overrides: Partial<StoredJourneyStateV3> = {}): StoredJourneyStateV3 => ({
  journeyId: REAL_ID,
  levelNr: 1,
  completionCount: 0,
  foundMapPiece: false,
  active: true,
  exploredSections: {},
  position: null,
  interiorLevelNr: null,
  ...overrides,
})

const makeApi = (journeys: StoredJourneyStateV3[], setJourneys = vi.fn()) =>
  createJourneysV3Api({
    journeys,
    setJourneys,
    journeyData: journeys.map(j => makeJourneyData(j.journeyId)),
  })

// ── markCellExplored ──────────────────────────────────────────────────────────

describe("markCellExplored", () => {
  it("stores the cell under the section hash key", () => {
    const stored = makeStoredJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markCellExplored("abc123", "0:3,4")
    expect(state[0].exploredSections["abc123"]).toContain("0:3,4")
  })

  it("deduplicates: calling twice does not double-store", () => {
    const stored = makeStoredJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markCellExplored("abc123", "0:1,2")
    api.markCellExplored("abc123", "0:1,2")
    expect(state[0].exploredSections["abc123"]).toHaveLength(1)
  })

  it("getExploredSections returns the full sections record", () => {
    const stored = makeStoredJourney({
      exploredSections: { sec1: ["0:0,0"], sec2: ["0:1,1"] },
    })
    const api = makeApi([stored])
    expect(api.getExploredSections(REAL_ID)).toEqual({ sec1: ["0:0,0"], sec2: ["0:1,1"] })
  })
})

// ── completeJourney ───────────────────────────────────────────────────────────

describe("completeJourney", () => {
  const makeActiveJourney = () =>
    makeStoredJourney({
      levelNr: 5,
      completionCount: 0,
      exploredSections: { sec1: ["0:1,2", "0:1,3"], sec2: ["0:2,2"], sec3: ["0:3,3"] },
      position: "0:3,3",
      active: true,
    })

  it("deactivates the journey", () => {
    const stored = makeActiveJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.completeJourney()
    expect(state[0].active).toBe(false)
  })

  it("increments completionCount (used for first-completion unlock checks)", () => {
    const stored = makeActiveJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.completeJourney()
    expect(state[0].completionCount).toBe(1)
  })

  it("preserves exploredSections so exploration is intact on revisit", () => {
    const stored = makeActiveJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.completeJourney()
    expect(state[0].exploredSections).toEqual(stored.exploredSections)
  })

  it("preserves levelNr so the player returns to where they left off", () => {
    const stored = makeActiveJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.completeJourney()
    expect(state[0].levelNr).toBe(5)
  })

  it("clears position (player re-enters from entrance)", () => {
    const stored = makeActiveJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.completeJourney()
    expect(state[0].position).toBeNull()
  })
})
