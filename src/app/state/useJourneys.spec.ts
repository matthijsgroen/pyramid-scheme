import { describe, expect, it, vi } from "vitest"
import { createJourneysV3Api, type StoredJourneyStateV3 } from "./useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
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
    expect(state[0].exploredSections["1:abc123"]).toContain("0:3,4")
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
    expect(state[0].exploredSections["1:abc123"]).toHaveLength(1)
  })

  it("getExploredSections returns sections for the current level, with prefix stripped", () => {
    const stored = makeStoredJourney({
      levelNr: 1,
      exploredSections: { "1:sec1": ["0:0,0"], "1:sec2": ["0:1,1"], "2:sec1": ["0:2,2"] },
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

// ── getJourney: randomSeed stability for interior pyramids ────────────────────

describe("getJourney randomSeed", () => {
  const makeInteriorJourneyData = (id: string): TranslatedJourney =>
    ({
      ...makeJourneyData(id),
      siteConfigs: [{}],
    }) as TranslatedJourney

  // createJourneysV3Api mirrors a hook that re-derives its return value from `journeys` on
  // every render — so each read/mutation here gets a fresh api bound to the current state,
  // the same way a component calling useJourneys() again after a state update would.
  const makeStatefulApi = (stored: StoredJourneyStateV3, journeyData: TranslatedJourney[]) => {
    let state = [stored]
    return () =>
      createJourneysV3Api({
        journeys: state,
        setJourneys: updater => {
          state = typeof updater === "function" ? updater(state) : updater
        },
        journeyData,
      })
  }

  it("keeps the same seed across a completion for an interior pyramid (site stays revisitable)", () => {
    const stored = makeStoredJourney({ levelNr: REAL_LEVEL_COUNT + 1, completionCount: 0, active: true })
    const freshApi = makeStatefulApi(stored, [makeInteriorJourneyData(REAL_ID)])
    const seedBefore = freshApi().getJourney(REAL_ID)!.randomSeed
    freshApi().completeJourney()
    const seedAfter = freshApi().getJourney(REAL_ID)!.randomSeed
    expect(seedAfter).toBe(seedBefore)
  })

  it("varies the seed across a completion for a non-interior journey (legacy repeat-run design)", () => {
    const stored = makeStoredJourney({ levelNr: REAL_LEVEL_COUNT + 1, completionCount: 0, active: true })
    const freshApi = makeStatefulApi(stored, [makeJourneyData(REAL_ID)])
    const seedBefore = freshApi().getJourney(REAL_ID)!.randomSeed
    freshApi().completeJourney()
    const seedAfter = freshApi().getJourney(REAL_ID)!.randomSeed
    expect(seedAfter).not.toBe(seedBefore)
  })
})

// ── markShopSlotPurchased / getPurchasedShopSlots ───────────────────────────────

describe("markShopSlotPurchased / getPurchasedShopSlots", () => {
  it("is not purchased until marked", () => {
    const api = makeApi([makeStoredJourney()])
    expect(api.getPurchasedShopSlots(REAL_ID).has("0:3,4#0")).toBe(false)
  })

  it("persists a per-slot purchase and reports it back", () => {
    const stored = makeStoredJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markShopSlotPurchased("0:3,4", 1)
    expect(state[0].purchasedStock).toEqual(["0:3,4#1"])
    expect(
      createJourneysV3Api({
        journeys: state,
        setJourneys: vi.fn(),
        journeyData: [makeJourneyData(REAL_ID)],
      })
        .getPurchasedShopSlots(REAL_ID)
        .has("0:3,4#1")
    ).toBe(true)
  })

  it("tracks slots of one shop independently", () => {
    const stored = makeStoredJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markShopSlotPurchased("0:3,4", 0)
    api.markShopSlotPurchased("0:3,4", 0) // dedup
    api.markShopSlotPurchased("0:3,4", 2)
    expect(state[0].purchasedStock).toEqual(["0:3,4#0", "0:3,4#2"])
  })
})

// ── corridor detector: known / found / outstanding (§7.2 P4) ────────────────────

describe("hidden corridor tracking", () => {
  // The api captures `journeys` at creation, so reads must run against a freshly-built api over the
  // latest state — mirrors how the hook rebuilds each render.
  const run = (steps: (api: ReturnType<typeof makeApi>) => void) => {
    let state = [makeStoredJourney()]
    const set = (updater: unknown) => {
      state =
        typeof updater === "function"
          ? (updater as (p: unknown) => StoredJourneyStateV3[])(state)
          : (updater as StoredJourneyStateV3[])
    }
    steps(createJourneysV3Api({ journeys: state, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] }))
    return {
      state,
      api: createJourneysV3Api({ journeys: state, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] }),
    }
  }

  it("registers known corridors keyed by levelNr and dedups", () => {
    const { state } = run(api => {
      api.registerHiddenCorridors(["a", "b"])
      api.registerHiddenCorridors(["a"]) // dedup
    })
    expect(state[0].knownHiddenCorridors).toEqual(["1:a", "1:b"])
  })

  it("outstanding = known minus found; clears once every known corridor is found", () => {
    const first = run(api => {
      api.registerHiddenCorridors(["a", "b"])
      api.markCorridorFound("a")
    })
    expect(first.api.getFoundHiddenCorridors(REAL_ID).has("a")).toBe(true)
    expect(first.api.getOutstandingHiddenCorridorCount(REAL_ID)).toBe(1) // b still outstanding

    const second = run(api => {
      api.registerHiddenCorridors(["a", "b"])
      api.markCorridorFound("a")
      api.markCorridorFound("b")
    })
    expect(second.api.getOutstandingHiddenCorridorCount(REAL_ID)).toBe(0) // all found → marker clears
  })
})
