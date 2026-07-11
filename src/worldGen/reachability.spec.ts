import { describe, expect, it } from "vitest"
import type { SiteConfig } from "./types"
import {
  computeReachability,
  floorKey,
  isJourneyEnterable,
  isTierUnlocked,
  mapPieceBucket,
  reachableFloorsInSite,
} from "./reachability"

// Two floors, floor 0's side section gated by `wardKeyId`, ending in a stairhead wired to
// floor 1's entrance — the same `wireStaircases`-style {stairId} pairing buildSite.ts uses
// for real ward-gated floor transitions.
const gatedTwoFloorSite = (wardKeyId: string): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: { stairId: "site:shortcut" },
        gate: { type: "tomb-key", wardKeyId },
      },
    ],
  },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "site:shortcut" },
    sideSections: [],
  },
]

const ungatedTwoFloorSite = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: { stairId: "site:main" },
    sideSections: [],
  },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "site:main" },
    sideSections: [],
  },
]

// The real tomb pattern (configBuilder.ts's buildTombConfigs): floor 0's own main-path
// treasure IS the key its own shortcut section requires — no external key needed at all.
const tombShapedSite = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    mainEndReward: { type: "tombKey", keyId: "floor0-treasure" },
    sideSections: [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: { stairId: "tomb:shortcut0" },
        gate: { type: "tomb-key", wardKeyId: "floor0-treasure" },
      },
    ],
  },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "tomb:shortcut0" },
    sideSections: [],
  },
]

// buildSite.ts's ward-wing pattern: every wing branches off the SAME host floor (index 0),
// not a linear i→i+1 chain — wing1 (array index 2) is a sibling of wing0 (index 1), not its
// dependent, and its entrance stairId is hosted on the host floor, not on wing0.
const twoSiblingWingsSite = (): SiteConfig => [
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: { stairId: "wing:0" },
        gate: { type: "tomb-key", wardKeyId: "wing-key-0" },
      },
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: { stairId: "wing:1" },
        gate: { type: "tomb-key", wardKeyId: "wing-key-1" },
      },
    ],
  },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "wing:0" },
    sideSections: [],
  },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    entrance: { stairId: "wing:1" },
    sideSections: [],
  },
]

describe(reachableFloorsInSite, () => {
  it("floor 0 is always reachable, no keys needed", () => {
    const site = gatedTwoFloorSite("some-key")
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set())
    expect(result.floors.has(0)).toBe(true)
  })

  it("a ward-gated floor is unreachable without its key", () => {
    const site = gatedTwoFloorSite("ward-key-1")
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set())
    expect(result.floors.has(1)).toBe(false)
  })

  it("the same floor becomes reachable once its key is held", () => {
    const site = gatedTwoFloorSite("ward-key-1")
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set(["ward-key-1"]))
    expect(result.floors.has(1)).toBe(true)
  })

  it("a floor's own treasure can be the key to its own shortcut — no external key needed", () => {
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, tombShapedSite(), new Set())
    expect(result.floors.has(1)).toBe(true)
  })

  it("sibling ward-wing branches off the same host floor don't block each other", () => {
    // Only wing-key-1 held: wing1 (index 2, hosted on floor 0) is reachable even though
    // wing0 (index 1) is not — they're siblings, not a linear chain, and wing1's host isn't
    // wing0's own grid.
    const result = reachableFloorsInSite(
      { journeyId: "j", levelIndex: 0 },
      twoSiblingWingsSite(),
      new Set(["wing-key-1"])
    )
    expect(result.floors.has(1)).toBe(false)
    expect(result.floors.has(2)).toBe(true)
  })

  it("an ungated multi-floor site is fully reachable with zero keys", () => {
    const site = ungatedTwoFloorSite()
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set())
    expect(result.floors).toEqual(new Set([0, 1]))
  })

  it("harvests map-piece and hieroglyph-fragment rewards found within the reachable area", () => {
    const site: SiteConfig = [
      {
        pathPuzzles: 1,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        mainEndReward: { type: "mapPiece", tombId: "some_tomb" },
        puzzleRewards: [{ type: "hieroglyphFragment", hieroglyphId: "p10" }],
        sideSections: [],
      },
    ]
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set())
    expect(result.harvestedCounts.get(mapPieceBucket("some_tomb"))).toBe(1)
    expect(result.harvestedCounts.get("hieroglyph:p10")).toBe(1)
  })

  it("does not harvest a reward sitting behind a still-locked gate", () => {
    // tomb-key gate (not floor-key) — its key must come from outside this floor, unlike a
    // floor-key gate whose host is always auto-injected within the same floor.
    const site: SiteConfig = [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          {
            pathPuzzles: 0,
            difficulty: "starter",
            end: "treasure",
            endReward: { type: "mapPiece", tombId: "locked_tomb" },
            gate: { type: "tomb-key", wardKeyId: "never-supplied" },
          },
        ],
      },
    ]
    const result = reachableFloorsInSite({ journeyId: "j", levelIndex: 0 }, site, new Set())
    expect(result.harvestedCounts.get(mapPieceBucket("locked_tomb"))).toBeUndefined()
  })
})

describe(isTierUnlocked, () => {
  it("starter is always unlocked", () => {
    expect(isTierUnlocked("starter", new Set())).toBe(true)
  })

  it("junior needs starter's tier-unlock treasure (starter_a_1)", () => {
    expect(isTierUnlocked("junior", new Set())).toBe(false)
    expect(isTierUnlocked("junior", new Set(["starter_a_1"]))).toBe(true)
  })
})

describe(isJourneyEnterable, () => {
  it("a tomb needs piecesRequired map pieces held, independent of tier", () => {
    expect(isJourneyEnterable("starter", new Set(), 4, 3)).toBe(false)
    expect(isJourneyEnterable("starter", new Set(), 4, 4)).toBe(true)
  })

  it("a pyramid (piecesRequired 0) only needs its tier unlocked", () => {
    expect(isJourneyEnterable("junior", new Set(), 0, 0)).toBe(false)
    expect(isJourneyEnterable("junior", new Set(["starter_a_1"]), 0, 0)).toBe(true)
  })
})

describe(computeReachability, () => {
  it("a key earned in one journey unlocks a floor in a completely different journey", () => {
    // The design doc's own "backward and forward" worked example, at unit scale: journey A's
    // own gate needs the SAME key as journey B's — computeReachability shares one ownedCounts
    // map across every journey, so holding it unlocks both at once, regardless of which
    // journey nominally "grants" it.
    const allConfigs: Record<string, SiteConfig[]> = {
      journeyA: [gatedTwoFloorSite("cross-journey-key")],
      journeyB: [gatedTwoFloorSite("cross-journey-key")],
    }
    const journeyMeta = {
      journeyA: { tier: "starter" as const, piecesRequired: 0 },
      journeyB: { tier: "starter" as const, piecesRequired: 0 },
    }

    const withoutKey = computeReachability(allConfigs, journeyMeta, new Map())
    expect(withoutKey.reachableFloors.has(floorKey({ journeyId: "journeyA", levelIndex: 0, floorIndex: 1 }))).toBe(
      false
    )
    expect(withoutKey.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(
      false
    )

    const withKey = computeReachability(allConfigs, journeyMeta, new Map([["cross-journey-key", 1]]))
    expect(withKey.reachableFloors.has(floorKey({ journeyId: "journeyA", levelIndex: 0, floorIndex: 1 }))).toBe(true)
    expect(withKey.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(true)
  })

  it("a journey below its piecesRequired threshold contributes no reachable floors at all", () => {
    const allConfigs: Record<string, SiteConfig[]> = { tomb: [ungatedTwoFloorSite()] }
    const journeyMeta = { tomb: { tier: "starter" as const, piecesRequired: 4 } }

    const result = computeReachability(allConfigs, journeyMeta, new Map([[mapPieceBucket("tomb"), 3]]))
    expect(result.reachableFloors.size).toBe(0)

    const enough = computeReachability(allConfigs, journeyMeta, new Map([[mapPieceBucket("tomb"), 4]]))
    expect(enough.reachableFloors.has(floorKey({ journeyId: "tomb", levelIndex: 0, floorIndex: 0 }))).toBe(true)
  })

  it("unlockedTiers reflects only starter plus whatever tier-unlock treasures are held", () => {
    const result = computeReachability(
      {},
      {},
      new Map([
        ["starter_a_1", 1],
        ["junior_a_1", 1],
      ])
    )
    expect(result.unlockedTiers).toEqual(new Set(["starter", "junior", "expert"]))
  })

  it("aggregates harvestedCounts across every reachable journey", () => {
    const allConfigs: Record<string, SiteConfig[]> = {
      journeyA: [ungatedTwoFloorSite()],
      tomb: [
        [
          {
            pathPuzzles: 0,
            difficulty: "starter" as const,
            end: "treasure" as const,
            exitOrStaircase: "exit" as const,
            mainEndReward: { type: "mapPiece" as const, tombId: "tomb" },
            sideSections: [],
          },
        ],
      ],
    }
    const journeyMeta = {
      journeyA: { tier: "starter" as const, piecesRequired: 0 },
      tomb: { tier: "starter" as const, piecesRequired: 0 },
    }
    const result = computeReachability(allConfigs, journeyMeta, new Map())
    expect(result.harvestedCounts.get(mapPieceBucket("tomb"))).toBe(1)
  })
})
