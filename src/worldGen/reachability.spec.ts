import { describe, expect, it } from "vitest"
import type { SiteConfig } from "./types"
import {
  computeReachability,
  floorKey,
  isTierUnlocked,
  reachableFloorsInSite,
  type ReachabilitySupport,
} from "./reachability"

// The map-piece bucket grammar (mirrors the tomb-treasure mod). Core reachability names no
// currency, so tests supply the currency knowledge the same way the mod does at runtime.
const mapPieceBucket = (tombId: string): string => `mapPiece:${tombId}`

// Stand-in for the tomb-treasure mod's ReachabilitySupport: harvest map pieces / tomb keys /
// hieroglyph fragments to their buckets, gate tombs on a map-piece threshold, and the tier ladder.
const TIER_UNLOCK: Record<string, string[]> = {
  junior: ["starter_a_1", "starter_a_2", "starter_a_3", "starter_a_4"],
  expert: ["junior_a_1", "junior_a_2", "junior_a_3", "junior_a_4"],
  master: ["expert_a_1", "expert_a_2", "expert_a_3", "expert_a_4"],
  wizard: ["master_a_1", "master_a_2", "master_a_3", "master_a_4"],
}
const testSupport = (entryThresholds: Record<string, number> = {}): ReachabilitySupport => ({
  bucketForReward: r =>
    r.type === "mapPiece"
      ? `mapPiece:${r.tombId as string}`
      : r.type === "tombKey"
        ? (r.keyId as string)
        : r.type === "hieroglyphFragment"
          ? `hieroglyph:${r.hieroglyphId as string}`
          : undefined,
  journeyEntryLock: j =>
    j in entryThresholds ? { bucket: mapPieceBucket(j), threshold: entryThresholds[j] } : undefined,
  tierUnlockBucket: t => TIER_UNLOCK[t],
})

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
        rewards: [{ type: "hieroglyphFragment", hieroglyphId: "p10" }],
        sideSections: [],
      },
    ]
    // Both map pieces and hieroglyph fragments route through injected support — reachability
    // names no mod currency.
    const result = reachableFloorsInSite(
      { journeyId: "j", levelIndex: 0 },
      site,
      new Set(),
      undefined,
      undefined,
      undefined,
      testSupport()
    )
    expect(result.harvestedCounts.get(mapPieceBucket("some_tomb"))).toBe(1)
    expect(result.harvestedCounts.get("hieroglyph:p10")).toBe(1)
  })

  it("also harvests tombKey rewards, so a tier-unlock treasure can propagate to a DIFFERENT journey's own reachability check — not just resolve gates within this same site", () => {
    // The fine BFS's own fixed point already resolves a tombKey WITHIN one site (see the
    // tombShapedSite test above) — but that's local to this call. Cross-journey propagation
    // (a starter treasure unlocking junior tier for every OTHER journey) only works if this
    // function's own return value exposes the fact, for computeReachability to aggregate.
    const site: SiteConfig = [
      {
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        mainEndReward: { type: "tombKey", keyId: "starter_a_1" },
        sideSections: [],
      },
    ]
    const result = reachableFloorsInSite(
      { journeyId: "j", levelIndex: 0 },
      site,
      new Set(),
      undefined,
      undefined,
      undefined,
      testSupport()
    )
    expect(result.harvestedCounts.get("starter_a_1")).toBe(1)
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
    const result = reachableFloorsInSite(
      { journeyId: "j", levelIndex: 0 },
      site,
      new Set(),
      undefined,
      undefined,
      undefined,
      testSupport()
    )
    expect(result.harvestedCounts.get(mapPieceBucket("locked_tomb"))).toBeUndefined()
  })
})

describe(isTierUnlocked, () => {
  it("a tier with no unlock buckets (starter) is always unlocked", () => {
    expect(isTierUnlocked("starter", new Set(), testSupport())).toBe(true)
  })

  it("junior needs at least one of its mod-supplied tier-unlock keys", () => {
    expect(isTierUnlocked("junior", new Set(), testSupport())).toBe(false)
    expect(isTierUnlocked("junior", new Set(["starter_a_1"]), testSupport())).toBe(true)
  })

  it("is unlocked by ANY single one of the tier's several keys, not just the first", () => {
    // A player who happened to find starter_a_3 (not starter_a_1) still gets full junior entry —
    // the whole point of spreading a tier's unlock across several keys is that finding any one of
    // them is enough; it must never require collecting all of them, or Wizard could get blocked.
    expect(isTierUnlocked("junior", new Set(["starter_a_3"]), testSupport())).toBe(true)
  })

  it("holding a later key without the first still unlocks (proves genuine any-of, not an ordering dependency)", () => {
    expect(isTierUnlocked("junior", new Set(["starter_a_4"]), testSupport())).toBe(true)
  })

  it("holding none of the tier's keys stays locked even if unrelated other buckets are held", () => {
    expect(isTierUnlocked("junior", new Set(["junior_a_1", "some_other_bucket"]), testSupport())).toBe(false)
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
    const journeyMeta = { journeyA: { tier: "starter" as const }, journeyB: { tier: "starter" as const } }

    const withoutKey = computeReachability(allConfigs, journeyMeta, new Map(), undefined, undefined, testSupport())
    expect(withoutKey.reachableFloors.has(floorKey({ journeyId: "journeyA", levelIndex: 0, floorIndex: 1 }))).toBe(
      false
    )
    expect(withoutKey.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(
      false
    )

    const withKey = computeReachability(
      allConfigs,
      journeyMeta,
      new Map([["cross-journey-key", 1]]),
      undefined,
      undefined,
      testSupport()
    )
    expect(withKey.reachableFloors.has(floorKey({ journeyId: "journeyA", levelIndex: 0, floorIndex: 1 }))).toBe(true)
    expect(withKey.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(true)
  })

  it("a tombKey granted within one journey's reachable area shows up in harvestedCounts, so a caller can fold it in and unlock a gate in a DIFFERENT journey on the next pass", () => {
    const allConfigs: Record<string, SiteConfig[]> = {
      journeyA: [
        [
          {
            pathPuzzles: 0,
            difficulty: "starter" as const,
            end: "treasure" as const,
            exitOrStaircase: "exit" as const,
            mainEndReward: { type: "tombKey" as const, keyId: "cross-journey-key" },
            sideSections: [],
          },
        ],
      ],
      journeyB: [gatedTwoFloorSite("cross-journey-key")],
    }
    const journeyMeta = { journeyA: { tier: "starter" as const }, journeyB: { tier: "starter" as const } }

    const first = computeReachability(allConfigs, journeyMeta, new Map(), undefined, undefined, testSupport())
    expect(first.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(false)
    expect(first.harvestedCounts.get("cross-journey-key")).toBe(1)

    const second = computeReachability(
      allConfigs,
      journeyMeta,
      first.harvestedCounts,
      undefined,
      undefined,
      testSupport()
    )
    expect(second.reachableFloors.has(floorKey({ journeyId: "journeyB", levelIndex: 0, floorIndex: 1 }))).toBe(true)
  })

  it("a journey below its (mod-supplied) map-piece entry threshold contributes no reachable floors at all", () => {
    const allConfigs: Record<string, SiteConfig[]> = { tomb: [ungatedTwoFloorSite()] }
    const journeyMeta = { tomb: { tier: "starter" as const } }
    const support = testSupport({ tomb: 4 })

    const result = computeReachability(
      allConfigs,
      journeyMeta,
      new Map([[mapPieceBucket("tomb"), 3]]),
      undefined,
      undefined,
      support
    )
    expect(result.reachableFloors.size).toBe(0)

    const enough = computeReachability(
      allConfigs,
      journeyMeta,
      new Map([[mapPieceBucket("tomb"), 4]]),
      undefined,
      undefined,
      support
    )
    expect(enough.reachableFloors.has(floorKey({ journeyId: "tomb", levelIndex: 0, floorIndex: 0 }))).toBe(true)
  })

  it("unlockedTiers reflects only the tiers whose (mod-supplied) unlock keys are held, plus the lockless first tier", () => {
    const result = computeReachability(
      {},
      {},
      new Map([
        ["starter_a_1", 1],
        ["junior_a_1", 1],
      ]),
      undefined,
      undefined,
      testSupport()
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
    const journeyMeta = { journeyA: { tier: "starter" as const }, tomb: { tier: "starter" as const } }
    const result = computeReachability(allConfigs, journeyMeta, new Map(), undefined, undefined, testSupport())
    expect(result.harvestedCounts.get(mapPieceBucket("tomb"))).toBe(1)
  })
})
