import { describe, expect, it, vi } from "vitest"
import { createJourneysV3Api, type StoredJourneyStateV3 } from "./useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { journeys as allJourneys } from "@/data/journeys"

// completeJourney checks against knownJourneyIds (the real journey list), so we
// need a real journey ID — use the first pyramid entry from the data.
const REAL_ID = allJourneys.find(j => j.exterior === "pyramid")!.id
const REAL_LEVEL_COUNT = allJourneys.find(j => j.exterior === "pyramid")!.levelCount

// Minimal journey stub — only fields createJourneysV3Api reads
const makeJourneyData = (id: string, levelCount = REAL_LEVEL_COUNT): TranslatedJourney =>
  ({
    id,
    exterior: "pyramid",
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

  it("keys by the level the caller was standing in, not the one the write lands on", () => {
    // The updater runs a microtask after the call (useOfflineStorage awaits its load promise), so a
    // completeLevel landing first moves levelNr on. Reading the level in there filed the cell under a
    // pyramid the player never opened; the key belongs to the render that called.
    let state = [makeStoredJourney({ levelNr: 1 })]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        const moved = state.map(j => ({ ...j, levelNr: 2 }))
        state = typeof updater === "function" ? updater(moved) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markCellExplored("abc123", "0:3,4")
    expect(state[0].exploredSections["1:abc123"]).toContain("0:3,4")
    expect(state[0].exploredSections["2:abc123"]).toBeUndefined()
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

  it("getExploredCells returns sections for the current level, with prefix stripped", () => {
    const stored = makeStoredJourney({
      levelNr: 1,
      exploredCells: { "1:sec1": ["0/~0"], "1:sec2": ["0/p1"], "2:sec1": ["0/~2"] },
    })
    const api = makeApi([stored])
    expect(api.getExploredCells(REAL_ID)).toEqual({ sec1: ["0/~0"], sec2: ["0/p1"] })
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
    expect(api.getPurchasedShopSlots(REAL_ID).has("sec#0/p3!0")).toBe(false)
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
    api.markShopSlotPurchased("sec#0/p3", 1)
    expect(state[0].purchasedStock).toEqual(["1:sec#0/p3!1"])
    expect(
      createJourneysV3Api({
        journeys: state,
        setJourneys: vi.fn(),
        journeyData: [makeJourneyData(REAL_ID)],
      })
        .getPurchasedShopSlots(REAL_ID)
        .has("sec#0/p3!1")
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
    api.markShopSlotPurchased("sec#0/p3", 0)
    api.markShopSlotPurchased("sec#0/p3", 0) // dedup
    api.markShopSlotPurchased("sec#0/p3", 2)
    expect(state[0].purchasedStock).toEqual(["1:sec#0/p3!0", "1:sec#0/p3!2"])
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

// ── floor exploration: "still stuff to find here" travel marker ─────────────────

describe("floor exploration tracking", () => {
  const run = (steps: (api: ReturnType<typeof makeApi>) => void, initial: Partial<StoredJourneyStateV3> = {}) => {
    let state = [makeStoredJourney(initial)]
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
  const NO_KEYS: ReadonlySet<string> = new Set()

  it("open (ungated) content marks its levelNr regardless of held keys", () => {
    const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, true, []))
    expect([...api.getUnexploredLevels(REAL_ID, NO_KEYS)]).toEqual([1])
  })

  it("a gated key bundle lights up only once every key in it is held (the earned-later case)", () => {
    const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 2, false, [["junior_a_1"]]))
    expect(api.getUnexploredLevels(REAL_ID, NO_KEYS).size).toBe(0) // no key yet → nothing to go back for
    expect([...api.getUnexploredLevels(REAL_ID, new Set(["junior_a_1"]))]).toEqual([1]) // key earned → lit
  })

  it("a multi-key bundle (ward + hieroglyphs) needs ALL its keys, not just one", () => {
    const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, false, [["ward_a_1", "hieroglyph:p10"]]))
    expect(api.getUnexploredLevels(REAL_ID, new Set(["ward_a_1"])).size).toBe(0) // only one held → not lit
    expect([...api.getUnexploredLevels(REAL_ID, new Set(["ward_a_1", "hieroglyph:p10"]))]).toEqual([1]) // both → lit
  })

  it("records against the passed journeyId even when the journey is no longer active", () => {
    // Recording runs from the interior's unmount cleanup — which can happen right after
    // completeJourney flips `active` to false. Passing journeyId explicitly (not relying on the
    // active journey) is what lets the completed journey still get its summary.
    const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, true, []), { active: false, completionCount: 1 })
    expect([...api.getUnexploredLevels(REAL_ID, NO_KEYS)]).toEqual([1])
  })

  it("files the summary under the level it is given, not the journey's current one", () => {
    // The recorder fires as the interior unmounts, which can be after the journey has moved on to the
    // next pyramid. It names the level it was showing; nothing here may look one up.
    const { state } = run(a => a.registerFloorExploration(REAL_ID, 2, 0, true, []), { levelNr: 4 })
    expect(state[0].floorExploration).toEqual({ "2:0": { open: true, keySets: [] } })
  })

  it("ignores floors filed under a level the journey has no node for", () => {
    // A journey has one node per site, so a tomb (one site) has one: a save filed under a higher
    // level can never be revisited or re-recorded, and counting it kept the card pulsing over
    // nothing left to go back to.
    const tomb = { ...makeJourneyData(REAL_ID), exterior: "tomb", levelCount: 1 } as TranslatedJourney
    const state = [
      makeStoredJourney({
        floorExploration: { "1:0": { open: false, keySets: [] }, "3:0": { open: true, keySets: [] } },
      }),
    ]
    const api = createJourneysV3Api({ journeys: state, setJourneys: () => {}, journeyData: [tomb] })
    expect(api.getUnexploredLevels(REAL_ID, NO_KEYS).size).toBe(0)
  })

  it("tolerates a floorExploration entry from an older build shape (no crash)", () => {
    // v0.30.0 stored { hasReward, wardKeys }; the field is loose persisted data. Reading it must not
    // throw on `keySets.some` — a save that didn't clear would otherwise black-screen on startup.
    const { api } = run(() => {}, {
      floorExploration: { "1:0": { hasReward: true, wardKeys: ["starter_a_1"] } } as never,
    })
    expect(() => api.getUnexploredLevels(REAL_ID, new Set(["starter_a_1"]))).not.toThrow()
    expect(api.getUnexploredLevels(REAL_ID, NO_KEYS).size).toBe(0) // pre-shape entry reads as empty
  })

  it("re-registering a floor overwrites its summary (content cleared → cleared)", () => {
    const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, false, []), {
      floorExploration: { "1:0": { open: true, keySets: [] } },
    })
    expect(api.getUnexploredLevels(REAL_ID, NO_KEYS).size).toBe(0)
  })

  it("does not touch storage when the journey isn't loaded yet (guards the progress-wipe race)", () => {
    // A freshly-mounted useJourneys() instance (e.g. SiteMapScreen entering a site) starts with
    // `journeys = []` until its own storage read resolves. The interior's floor-leave/unmount
    // cleanup calls registerFloorExploration regardless — if that write went through against this
    // placeholder empty state, it would overwrite every other journey's persisted progress with `[]`.
    let setJourneysCalls = 0
    const state: StoredJourneyStateV3[] = []
    const set = () => {
      setJourneysCalls += 1
    }
    const api = createJourneysV3Api({ journeys: state, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] })
    api.registerFloorExploration(REAL_ID, 1, 0, true, [])
    expect(setJourneysCalls).toBe(0)
  })
})

describe("navigation mutators are awaitable", () => {
  // Travel shows the expedition the moment the player picks a pyramid. useJourneys() is not a
  // context, so every other instance — App's, which decides what PyramidExpedition is mounted
  // with — only sees the new level once the write is persisted. These two must therefore report
  // when that has happened, or the expedition mounts describing the level being left behind.
  const deferredSetJourneys = () => {
    let resolveWrite!: () => void
    const written = new Promise<void>(resolve => {
      resolveWrite = resolve
    })
    return { setJourneys: () => written, resolveWrite }
  }

  it("visitLevel resolves only once the write is persisted", async () => {
    const { setJourneys, resolveWrite } = deferredSetJourneys()
    const api = createJourneysV3Api({
      journeys: [makeStoredJourney()],
      setJourneys,
      journeyData: [makeJourneyData(REAL_ID)],
    })

    let settled = false
    const pending = api.visitLevel(REAL_ID, 1).then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    resolveWrite()
    await pending
    expect(settled).toBe(true)
  })

  it("startJourney resolves only once the write is persisted", async () => {
    const { setJourneys, resolveWrite } = deferredSetJourneys()
    const api = createJourneysV3Api({
      journeys: [makeStoredJourney()],
      setJourneys,
      journeyData: [makeJourneyData(REAL_ID)],
    })

    let settled = false
    const pending = api.startJourney(allJourneys.find(j => j.id === REAL_ID)!).then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    resolveWrite()
    await pending
    expect(settled).toBe(true)
  })
})

// ── the ordinal backfill (docs/game-design/world-stability.md) ─────────────────

describe("re-keying bookkeeping", () => {
  it("offers a save that has coordinates but no ordinals", () => {
    const api = makeApi([makeStoredJourney({ exploredSections: { "1:abc": ["0:3,4"] } })])

    expect(api.journeysNeedingReKey().map(j => j.journeyId)).toEqual([REAL_ID])
  })

  // The key format has changed once already (the floor joined it). A save re-keyed under the old one
  // is as wrong as an untranslated save, and the archive it was translated from is still there.
  it("offers a save translated under an older key format", () => {
    const api = makeApi([
      makeStoredJourney({
        exploredSections: { "1:abc": ["0:3,4"] },
        exploredCells: { "1:abc": ["7@rfork"] },
        cellKeyVersion: 2,
      }),
    ])

    expect(api.journeysNeedingReKey().map(j => j.journeyId)).toEqual([REAL_ID])
  })

  it("picks up an unstamped save even with nothing to translate, so it ends up stamped", () => {
    expect(
      makeApi([makeStoredJourney()])
        .journeysNeedingReKey()
        .map(j => j.journeyId)
    ).toEqual([REAL_ID])
  })

  it("counts an EMPTY result as migrated, so it is not retried on every launch", () => {
    // A save whose every stored coordinate turned out to be stale translates to nothing. That is a
    // finished migration, not an unstarted one — the stamp says so, not the contents.
    const api = makeApi([
      makeStoredJourney({ exploredSections: { "1:abc": ["0:3,4"] }, exploredCells: {}, cellKeyVersion: 3 }),
    ])

    expect(api.journeysNeedingReKey()).toEqual([])
  })

  it("writes the re-keyed state against the journey it came from", () => {
    let state = [makeStoredJourney({ exploredSections: { "1:abc": ["0:3,4"] } })]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })

    api.setCarveIndependentState(REAL_ID, {
      exploredCells: { "1:abc": ["0/p7"] },
      positionKey: "abc#0/p7",
      disabledTraps: ["1:abc#0/p2"],
      skippedConsumables: [],
      purchasedStock: [],
      knownHiddenCorridors: [],
      foundHiddenCorridors: [],
    })

    expect(state[0].exploredCells).toEqual({ "1:abc": ["0/p7"] })
    expect(state[0].positionKey).toBe("abc#0/p7")
    expect(state[0].disabledTraps).toEqual(["1:abc#0/p2"])
    // Stamped, so the next launch leaves it alone — and the coordinates stay as the archive.
    expect(state[0].cellKeyVersion).toBe(3)
    expect(state[0].exploredSections).toEqual({ "1:abc": ["0:3,4"] })
  })
})

// ── the stamp as a watermark, which the reshape release reads ─────────────────

describe("cellKeyVersion as a record of having been through this release", () => {
  it("offers a save with nothing explored, so every save ends up stamped", () => {
    // Not because there is anything to translate — there is not — but because the reshape decides
    // whether a save can be carried across at all by this stamp, and "no pyramid walked yet" must not
    // read the same as "never migrated".
    const api = makeApi([makeStoredJourney({ exploredSections: {} })])

    expect(api.journeysNeedingReKey().map(j => j.journeyId)).toEqual([REAL_ID])
  })

  it("starts a new journey already stamped", async () => {
    let state: StoredJourneyStateV3[] = []
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })

    await api.startJourney({ id: REAL_ID, levelCount: REAL_LEVEL_COUNT } as Parameters<typeof api.startJourney>[0])

    expect(state[0].cellKeyVersion).toBe(3)
  })

  it("leaves a save that already carries the current stamp alone", () => {
    const api = makeApi([makeStoredJourney({ cellKeyVersion: 3 })])

    expect(api.journeysNeedingReKey()).toEqual([])
  })
})
