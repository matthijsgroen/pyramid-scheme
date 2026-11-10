import { describe, expect, it, vi } from "vitest"
import { createJourneysV3Api, MECHANISM_AT_REST, type StoredJourneyStateV3 } from "./useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { journeys as allJourneys } from "@/data/journeys"
import { RELAID_FLOORS_VERSION } from "@/app/SiteMap/relaidPyramids"

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
  it("stores the cell under its section's authoring address", () => {
    const stored = makeStoredJourney()
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    api.markCellExplored("sec#0/p4")
    expect(state[0].exploredCells?.["1:sec"]).toContain("0/p4")
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
    api.markCellExplored("sec#0/p4")
    expect(state[0].exploredCells?.["1:sec"]).toContain("0/p4")
    expect(state[0].exploredCells?.["2:sec"]).toBeUndefined()
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
    api.markCellExplored("sec#0/p2")
    api.markCellExplored("sec#0/p2")
    expect(state[0].exploredCells?.["1:sec"]).toHaveLength(1)
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

// ── updatePosition ────────────────────────────────────────────────────────────

describe("updatePosition", () => {
  const run = (steps: (api: ReturnType<typeof makeApi>) => void, initial: Partial<StoredJourneyStateV3> = {}) => {
    let state = [makeStoredJourney(initial)]
    const set = (updater: unknown) => {
      state =
        typeof updater === "function"
          ? (updater as (p: StoredJourneyStateV3[]) => StoredJourneyStateV3[])(state)
          : (updater as StoredJourneyStateV3[])
    }
    steps(createJourneysV3Api({ journeys: state, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] }))
    return { state }
  }

  it("walking onto a place records it", () => {
    const { state } = run(api => api.updatePosition(REAL_ID, "sec#0/p2"))
    expect(state[0].positionKey).toBe("sec#0/p2")
  })

  it("leaves the recorded position at the last place, not the bend just walked onto", () => {
    const { state } = run(api => api.updatePosition(REAL_ID, "sec#0/~4"), { positionKey: "sec#0/p2" })
    expect(state[0].positionKey).toBe("sec#0/p2")
  })

  it("a player who has only stood on bends since entering resolves to the entrance (null)", () => {
    const { state } = run(
      api => {
        api.updatePosition(REAL_ID, "sec#0/~1")
        api.updatePosition(REAL_ID, "sec#0/~2")
      },
      { positionKey: null }
    )
    expect(state[0].positionKey).toBeNull()
  })
})

// ── standingKey clears everywhere positionKey does ─────────────────────────────

describe("standingKey clears wherever positionKey does", () => {
  // Writers are found, not listed: every function on the api is called with each shape of argument the
  // api takes, and any that moves `positionKey` must not leave the stale `standingKey` behind — it
  // outranks `positionKey` in both readers. A sixth writer is caught the day it exists.
  const STALE = "sec#0/~4"
  const journey = allJourneys.find(j => j.id === REAL_ID)!
  const argumentShapes: unknown[][] = [[], [REAL_ID, 2], [journey], [REAL_ID, "sec#0/p9"]]
  const startingPoints = [1, journey.levelCount + 1]

  const probe = () => {
    const writers = new Map<string, StoredJourneyStateV3[]>()
    const names = Object.entries(makeApi([makeStoredJourney()]))
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
    for (const name of names) {
      for (const levelNr of startingPoints) {
        for (const args of argumentShapes) {
          let state = [makeStoredJourney({ levelNr, positionKey: "sec#0/p2", standingKey: STALE })]
          const api = createJourneysV3Api({
            journeys: state,
            setJourneys: updater => {
              state = typeof updater === "function" ? updater(state) : updater
            },
            journeyData: [makeJourneyData(REAL_ID)],
          }) as unknown as Record<string, (...a: unknown[]) => unknown>
          try {
            api[name](...args)
          } catch {
            continue
          }
          if (state[0].positionKey !== "sec#0/p2") writers.set(name, [...(writers.get(name) ?? []), ...state])
        }
      }
    }
    return writers
  }

  it("no writer that moves positionKey leaves the stale standingKey behind", () => {
    const writers = probe()
    expect(writers.size).toBeGreaterThan(0)
    for (const [name, states] of writers) {
      for (const stored of states) {
        expect(stored.standingKey, `${name} moved positionKey but kept a stale standingKey`).not.toBe(STALE)
      }
    }
  })

  it("the writers it finds are the ones known, so a probe gone blind or a new writer is noticed", () => {
    expect([...probe().keys()].sort()).toEqual(
      [
        "completeJourney",
        "completeLevel",
        "enterAt",
        "setRelaidFloors",
        "startJourney",
        "updatePosition",
        "visitLevel",
      ].sort()
    )
  })
})

// ── completeJourney ───────────────────────────────────────────────────────────

describe("completeJourney", () => {
  const makeActiveJourney = () =>
    makeStoredJourney({
      levelNr: 5,
      completionCount: 0,
      exploredCells: { "5:sec1": ["0/p1", "0/p2"], "5:sec2": ["0/p0"] },
      positionKey: "sec1#0/p2",
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

  it("preserves exploredCells so exploration is intact on revisit", () => {
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
    expect(state[0].exploredCells).toEqual(stored.exploredCells)
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
    expect(state[0].positionKey).toBeNull()
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

// ── setMechanismState / getMechanismStates ──────────────────────────────────────

describe("mechanism positions", () => {
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

  it("tells a mechanism put back to rest apart from one never touched", () => {
    const untouched = run(() => {})
    expect(untouched.api.getMechanismStates(REAL_ID).has("s0#0/p1")).toBe(false)

    const routed = run(api => api.setMechanismState("s0#0/p1", "s1"))
    expect(routed.api.getMechanismStates(REAL_ID).get("s0#0/p1")).toBe("s1")

    const atRest = run(api => api.setMechanismState("s0#0/p1", MECHANISM_AT_REST))
    const states = atRest.api.getMechanismStates(REAL_ID)
    expect(states.get("s0#0/p1")).toBe(MECHANISM_AT_REST)
    expect(states.has("s0#0/p1")).toBe(true)
  })

  it("keeps one position per mechanism, replacing rather than accumulating", () => {
    const { state } = run(api => {
      api.setMechanismState("s0#0/p1", "s1")
      api.setMechanismState("s0#0/p1", "s2")
    })
    expect(state[0].mechanismStates).toEqual({ "1:s0#0/p1": "s2" })
  })

  it("stores a position value without interpreting it, whatever characters it carries", () => {
    const { api } = run(a => a.setMechanismState("s0#0/p1", "odd=label"))
    expect(api.getMechanismStates(REAL_ID).get("s0#0/p1")).toBe("odd=label")
  })

  it("hands a level only its own positions, never another level's of the same journey", () => {
    // The address a mechanism is stored under carries no level, so the `${levelNr}:` prefix is the
    // only thing keeping two levels of one journey apart — and two levels of one journey both
    // standing a lever is ordinary, not exotic.
    const api = makeApi([
      makeStoredJourney({ levelNr: 2, mechanismStates: { "1:lever#0/xhandle": "right", "2:gate#0/xhandle": "left" } }),
    ])
    expect([...api.getMechanismStates(REAL_ID)]).toEqual([["gate#0/xhandle", "left"]])
  })

  it("hands a level nothing when every stored position belongs to another level", () => {
    const api = makeApi([makeStoredJourney({ levelNr: 2, mechanismStates: { "1:lever#0/xhandle": "right" } })])
    expect(api.getMechanismStates(REAL_ID).size).toBe(0)
  })
})

describe("sequences that hide their order", () => {
  const run = (steps: (api: ReturnType<typeof makeApi>) => void, start = makeStoredJourney()) => {
    let state = [start]
    const set = (updater: unknown) => {
      state =
        typeof updater === "function"
          ? (updater as (p: unknown) => StoredJourneyStateV3[])(state)
          : (updater as StoredJourneyStateV3[])
    }
    steps(createJourneysV3Api({ journeys: state, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] }))
    // A reload: the save as storage would hand it back.
    const reloaded = JSON.parse(JSON.stringify(state)) as StoredJourneyStateV3[]
    return {
      state,
      api: createJourneysV3Api({ journeys: reloaded, setJourneys: set, journeyData: [makeJourneyData(REAL_ID)] }),
    }
  }

  it("keeps the steps walked and the read across a reload", () => {
    const { api } = run(a => {
      a.recordWalkedSteps([{ address: "s0#0/p1", steps: [2, 0] }])
      a.recordWalkedSteps([{ address: "s0#0/p1", steps: [1] }])
    })
    expect(api.getSequenceReads(REAL_ID).get("s0#0/p1")).toEqual({ walked: [0, 1, 2] })
    const read = run(
      a => a.readSequence("s0#0/p1"),
      makeStoredJourney({ sequenceReads: { "1:s0#0/p1": { walked: [0, 1] } } })
    )
    expect(read.api.getSequenceReads(REAL_ID).get("s0#0/p1")).toEqual({ walked: [0, 1], read: true })
  })

  it("records a save's first walk at done as read, and a first walk short of done unread", () => {
    const atDone = run(
      a => a.recordWalkedSteps([{ address: "s0#0/p1", steps: [1], atDone: true }]),
      makeStoredJourney({ mechanismStates: { "1:s0#0/p1": "3" } })
    )
    expect(atDone.api.getSequenceReads(REAL_ID).get("s0#0/p1")).toEqual({ walked: [1], read: true })
    const fresh = run(a => a.recordWalkedSteps([{ address: "s0#0/p1", steps: [0], atDone: false }]))
    expect(fresh.api.getSequenceReads(REAL_ID).get("s0#0/p1")).toEqual({ walked: [0] })
  })

  it("starts the run again from its first step when the order is read, from done included", () => {
    const { api } = run(a => a.readSequence("s0#0/p1"), makeStoredJourney({ mechanismStates: { "1:s0#0/p1": "3" } }))
    expect(api.getMechanismStates(REAL_ID).get("s0#0/p1")).toBe("0")
  })

  it("writes nothing on a second read, so a run walked after the first is kept", () => {
    const start = makeStoredJourney({
      mechanismStates: { "1:s0#0/p1": "3" },
      sequenceReads: { "1:s0#0/p1": { walked: [0, 1, 2], read: true } },
    })
    const { state } = run(a => a.readSequence("s0#0/p1"), start)
    expect(state[0]).toBe(start)
  })

  it("reads an absent record as nothing walked and nothing read", () => {
    expect(makeApi([makeStoredJourney()]).getSequenceReads(REAL_ID).size).toBe(0)
  })
})

// ── corridor detector: known / found / outstanding (collection-and-detector-design.md) ──

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

  describe("what a pull opened since the floor was saved", () => {
    const isWeb = (key: string) => key.startsWith("web:")

    it("lights a floor saved behind a web door once its key is held", () => {
      const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, false, [["web:moon"]]))
      expect([...api.getUnexploredLevels(REAL_ID, new Set(["web:moon"]), isWeb)]).toEqual([1])
    })

    it("does not light before the key is held", () => {
      const { api } = run(a => a.registerFloorExploration(REAL_ID, 1, 0, false, [["web:moon"]]))
      expect(api.getUnexploredLevels(REAL_ID, NO_KEYS, isWeb).size).toBe(0)
    })

    it("does not light a pyramid never visited, whatever is pulled", () => {
      const { api } = run(() => {})
      expect(api.getUnexploredLevels(REAL_ID, new Set(["web:moon"]), isWeb).size).toBe(0)
    })

    it("does not count ungated or ward-gated content", () => {
      const { api } = run(a => {
        a.registerFloorExploration(REAL_ID, 1, 0, true, [])
        a.registerFloorExploration(REAL_ID, 1, 1, false, [["junior_a_1"]])
      })
      expect(api.getUnexploredLevels(REAL_ID, new Set(["junior_a_1", "web:moon"]), isWeb).size).toBe(0)
    })
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
    // A journey has one node per site: a save filed under a higher level can never be revisited or
    // re-recorded, and counting it kept the card pulsing over nothing left to go back to.
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

describe("revisiting a finished journey", () => {
  const stored = (journeyId: string, overrides: Partial<StoredJourneyStateV3> = {}) =>
    makeStoredJourney({ journeyId, ...overrides })
  const run = (journeys: StoredJourneyStateV3[]) => {
    let state = journeys
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: journeys.map(j => makeJourneyData(j.journeyId, 2)),
    })
    return { api, state: () => state }
  }

  it("is not in progress while active again, and a first run is", () => {
    const { api } = run([
      stored("made-up-done", { active: true, completionCount: 1, levelNr: 2 }),
      stored("made-up-first", { active: true, completionCount: 0 }),
    ])
    expect(api.getJourney("made-up-done")?.inProgress).toBe(false)
    expect(api.getJourney("made-up-first")?.inProgress).toBe(true)
  })

  it("is left behind when another journey is started", () => {
    const { api, state } = run([stored("made-up-done", { active: true, completionCount: 1, interiorLevelNr: 2 })])
    void api.startJourney(makeJourneyData("made-up-new"))
    expect(state().map(j => [j.journeyId, j.active, j.interiorLevelNr])).toEqual([
      ["made-up-done", false, null],
      ["made-up-new", true, null],
    ])
  })

  it("is left behind when a pyramid of another journey is visited", () => {
    const { api, state } = run([
      stored("made-up-done", { active: true, completionCount: 1 }),
      stored("made-up-other", { active: false, completionCount: 1 }),
    ])
    void api.visitLevel("made-up-other", 1)
    expect(state().map(j => [j.journeyId, j.active])).toEqual([
      ["made-up-done", false],
      ["made-up-other", true],
    ])
  })
})

describe("the re-laid pyramids step", () => {
  const stateful = (stored: StoredJourneyStateV3) => {
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    return { api, current: () => state[0] }
  }

  const standing = makeStoredJourney({
    levelNr: 2,
    interiorLevelNr: 2,
    positionKey: "main#0/p2",
    standingKey: "main#0/~7",
    exploredCells: { "2:main": ["0/p0", "0/p2"] },
    mechanismStates: { "2:main#0/xmech:lever": "open" },
  })

  it("offers every save not yet stamped, standing anywhere or nowhere", () => {
    const api = makeApi([makeStoredJourney()])

    expect(api.journeysNeedingRelaidFloors().map(j => j.journeyId)).toEqual([REAL_ID])
  })

  it("leaves a save already stamped alone", () => {
    const api = makeApi([makeStoredJourney({ relaidFloorsVersion: RELAID_FLOORS_VERSION })])

    expect(api.journeysNeedingRelaidFloors()).toEqual([])
  })

  it("forgets where a save inside a re-laid pyramid stands, and keeps its level, its exploration and its mechanisms", () => {
    const { api, current } = stateful(standing)

    api.setRelaidFloors(REAL_ID, true)

    expect(current()).toEqual({
      ...standing,
      positionKey: null,
      standingKey: null,
      relaidFloorsVersion: RELAID_FLOORS_VERSION,
    })
  })

  it("only stamps a save that stands elsewhere", () => {
    const { api, current } = stateful(standing)

    api.setRelaidFloors(REAL_ID, false)

    expect(current()).toEqual({ ...standing, relaidFloorsVersion: RELAID_FLOORS_VERSION })
  })

  it("starts a new journey already stamped, so a place taken after the release is kept", async () => {
    let state: StoredJourneyStateV3[] = []
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })

    await api.startJourney({ id: REAL_ID, levelCount: REAL_LEVEL_COUNT } as Parameters<typeof api.startJourney>[0])

    expect(state[0].relaidFloorsVersion).toBe(RELAID_FLOORS_VERSION)
  })
})

describe("coming back to a pyramid from the travel map", () => {
  const stateful = (stored: StoredJourneyStateV3) => {
    let state = [stored]
    const api = createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    })
    return { api, current: () => state[0] }
  }
  // Inside pyramid 2, backed out to the map with the interior still open.
  const insideTwo = makeStoredJourney({
    levelNr: 2,
    interiorLevelNr: 2,
    positionKey: "main#1/p2",
    standingKey: "main#1/~7",
  })
  const standing = (stored: StoredJourneyStateV3) => [stored.positionKey ?? null, stored.standingKey ?? null]

  it("resumes where the player stood when they backed out of it", async () => {
    const { api, current } = stateful(insideTwo)

    await api.visitLevel(REAL_ID, 3)
    expect(standing(current())).toEqual([null, null])
    await api.visitLevel(REAL_ID, 2)

    expect(current().levelNr).toBe(2)
    expect(standing(current())).toEqual(["main#1/p2", "main#1/~7"])
  })

  it("starts at the entrance of a pyramid visited for the first time", async () => {
    const { api, current } = stateful(insideTwo)

    await api.visitLevel(REAL_ID, 3)

    expect(current()).toMatchObject({ levelNr: 3, positionKey: null, standingKey: null })
  })

  it("starts a save that remembers no position, as an older save, at the entrance", async () => {
    const { api, current } = stateful(makeStoredJourney({ levelNr: 3, positionKey: "main#0/p4" }))

    await api.visitLevel(REAL_ID, 2)

    expect(standing(current())).toEqual([null, null])
    expect(current().pyramidPositions).toBeUndefined()
  })

  it("starts at the entrance of a pyramid the player left by its way out", async () => {
    const { api, current } = stateful(insideTwo)
    await api.visitLevel(REAL_ID, 3)
    await api.visitLevel(REAL_ID, 2)

    api.setInteriorLevel(REAL_ID, null)
    await api.visitLevel(REAL_ID, 3)
    await api.visitLevel(REAL_ID, 2)

    expect(standing(current())).toEqual([null, null])
  })

  it("forgets the position remembered in a re-laid pyramid, and keeps the others", async () => {
    const { api, current } = stateful(insideTwo)
    await api.visitLevel(REAL_ID, 3)
    api.setInteriorLevel(REAL_ID, 3)
    api.updatePosition(REAL_ID, "main#0/p1")
    await api.visitLevel(REAL_ID, 4)

    api.setRelaidFloors(REAL_ID, false, [2, 4])

    expect(current().pyramidPositions).toEqual({ 3: { positionKey: "main#0/p1", standingKey: "main#0/p1" } })
  })

  it("restarts a finished run in its first pyramid where the player stood in it", async () => {
    const journey = allJourneys.find(j => j.id === REAL_ID)!
    const { api, current } = stateful(
      makeStoredJourney({
        levelNr: journey.levelCount + 1,
        pyramidPositions: { 1: { positionKey: "main#0/p3", standingKey: null } },
      })
    )

    await api.startJourney(journey)

    expect(current().levelNr).toBe(1)
    expect(standing(current())).toEqual(["main#0/p3", null])
  })
})

describe("a save holding a journey the build no longer has", () => {
  const gone = makeStoredJourney({ journeyId: "no_such_journey", active: true })

  it("has no active journey, and still answers for the journeys it does have", () => {
    const api = makeApi([gone, makeStoredJourney({ journeyId: REAL_ID, active: false })])
    expect(api.activeJourneyId).toBeUndefined()
    expect(api.getJourney(REAL_ID)).toBeDefined()
  })
})

// ── enterAt ───────────────────────────────────────────────────────────────────

describe("enterAt", () => {
  const run = (journeys: StoredJourneyStateV3[], ...args: Parameters<ReturnType<typeof makeApi>["enterAt"]>) => {
    let state = journeys
    createJourneysV3Api({
      journeys,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [makeJourneyData(REAL_ID)],
    }).enterAt(...args)
    return state
  }

  it("opens the site's interior with the explorer standing at the address", () => {
    const [placed] = run([makeStoredJourney({ active: false })], REAL_ID, 2, "main#0/p2")

    expect(placed).toMatchObject({
      active: true,
      levelNr: 2,
      interiorLevelNr: 2,
      positionKey: "main#0/p2",
      standingKey: "main#0/p2",
    })
  })

  it("writes the ground it stands the explorer on down explored, and resumes a corridor at no place", () => {
    const [placed] = run([makeStoredJourney({ active: false })], REAL_ID, 2, "main#0/~3|4", true)

    expect(placed).toMatchObject({ positionKey: null, standingKey: "main#0/~3|4" })
    expect(placed.exploredCells?.["2:main"]).toContain("0/~3|4")
  })

  it("starts a journey that never was, and puts the active one down", () => {
    const state = run([makeStoredJourney({ journeyId: "other", interiorLevelNr: 1 })], REAL_ID, 1, null)

    expect(state.find(j => j.journeyId === "other")).toMatchObject({ active: false, interiorLevelNr: null })
    expect(state.find(j => j.journeyId === REAL_ID)).toMatchObject({ active: true, levelNr: 1, positionKey: null })
  })
})
