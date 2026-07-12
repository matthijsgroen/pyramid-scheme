import { describe, expect, it } from "vitest"
import { SECONDARY_TOMBS, validateDiscovery, validateEconomyGuard, validateRewardCounts } from "./validate"
import { WORLD_TARGETS } from "./worldSpec"
import { PYRAMID_JOURNEYS } from "./data"
import type { FloorConfig, SiteConfig, TreasureReward } from "./types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

const fillFragments = (n: number): FloorConfig["sideSections"] =>
  Array.from({ length: n }, (_, i) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    endReward: { type: "hieroglyphFragment" as const, hieroglyphId: `h${i}` },
  }))

describe("validateRewardCounts", () => {
  it("throws when a non-last floor is set to exit incorrectly", () => {
    const configs = { site: [[floor({ exitOrStaircase: "staircase" })]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(/expected "exit"/)
  })

  it("throws when mapPiece count doesn't match WORLD_TARGETS", () => {
    const configs = { site: [[floor()]] as SiteConfig[] }
    expect(() => validateRewardCounts(configs)).toThrow(new RegExp(`Expected ${WORLD_TARGETS.mapPieceRewards} map`))
  })

  it("throws when a mapPiece references an unknown journey id", () => {
    const configs = {
      site: [
        [
          floor({
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "starter",
                end: "treasure",
                endReward: { type: "mapPiece", tombId: "not_real" },
              },
            ],
          }),
        ],
      ] as SiteConfig[],
    }
    expect(() => validateRewardCounts(configs)).toThrow(/unknown journey IDs/)
  })

  // A config valid on every OTHER check (mapPiece count, known journey ids) so the
  // fragment-count tests below isolate just that one check. Mosaic is no longer a
  // validateRewardCounts concern — it's a mod-owned capped currency the placement pass
  // hard-fails on, not a post-hoc count here.
  const validConfigWithFragments = (n: number): Record<string, SiteConfig[]> => {
    const realTombId = PYRAMID_JOURNEYS[0].id
    return {
      [realTombId]: [
        [
          floor({
            sideSections: [
              ...fillFragments(n),
              ...Array.from({ length: WORLD_TARGETS.mapPieceRewards }, () => ({
                pathPuzzles: 0,
                difficulty: "starter" as const,
                end: "treasure" as const,
                endReward: { type: "mapPiece" as const, tombId: realTombId },
              })),
            ],
          }),
        ],
      ] as SiteConfig[],
    }
  }

  // The "is this a gating-currency reward" predicate is injected (in production, built from the
  // registered currencies). Here a stand-in matching the hieroglyphFragment rewards fillFragments emits.
  const isFragment = (r: TreasureReward) => r.type === "hieroglyphFragment"

  it("passes when counts exactly match WORLD_TARGETS and all mapPiece ids are known", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(5), 5, isFragment)).not.toThrow()
  })

  it("throws when the gating-currency reward count doesn't match the injected expectation", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(3), 5, isFragment)).toThrow(
      /Expected 5 gating-currency rewards, got 3/
    )
  })

  it("skips the currency-reward check entirely when no expectation is injected", () => {
    expect(() => validateRewardCounts(validConfigWithFragments(3), undefined, isFragment)).not.toThrow()
  })
})

// A config set where every SECONDARY_TOMBS entry already has its mapPiece hosted on a
// reachable site — the ward-key ordering tests below only care about tomb-key gates, so they
// build on top of this to avoid tripping the (separate) mapPiece-discovery check.
const discoverableBase = (): Record<string, SiteConfig[]> => {
  const configs: Record<string, SiteConfig[]> = {}
  for (const [primaryId, secondaryIds] of Object.entries(SECONDARY_TOMBS)) {
    configs[primaryId] ??= [[floor()]]
    for (const secondaryId of secondaryIds) {
      configs[primaryId][0][0].sideSections.push({
        pathPuzzles: 0,
        difficulty: "starter",
        end: "treasure",
        endReward: { type: "mapPiece", tombId: secondaryId },
      })
      configs[secondaryId] ??= [[floor()]]
    }
  }
  return configs
}

const tombKeyGate = (wardKeyId: string) => ({
  pathPuzzles: 0,
  difficulty: "starter" as const,
  end: "treasure" as const,
  gate: { type: "tomb-key" as const, wardKeyId },
})

describe("validateDiscovery", () => {
  it("throws when a secondary tomb has no reachable mapPiece", () => {
    const configs = {
      expert_treasure_tomb: [[floor()]] as SiteConfig[],
      expert_treasure_tomb_b: [[floor()]] as SiteConfig[],
    }
    expect(() => validateDiscovery(configs)).toThrow(/expert_treasure_tomb_b/)
  })

  it("passes once every SECONDARY_TOMBS entry has a mapPiece hosted on a reachable site", () => {
    expect(() => validateDiscovery(discoverableBase())).not.toThrow()
  })

  it("throws when a tomb-key gate requires a key that's never granted anywhere", () => {
    const configs = { ...discoverableBase(), site: [[floor({ sideSections: [tombKeyGate("ghost")] })]] as SiteConfig[] }
    expect(() => validateDiscovery(configs)).toThrow(/"ghost".*never granted/)
  })

  it("throws when a same-site ward key is required before the floor that grants it", () => {
    const configs = {
      ...discoverableBase(),
      site: [
        [floor({ sideSections: [tombKeyGate("k1")] }), floor({ mainEndReward: { type: "tombKey", keyId: "k1" } })],
      ] as SiteConfig[],
    }
    expect(() => validateDiscovery(configs)).toThrow(/"k1".*floor 0.*floor 1/)
  })

  it("passes when a same-site ward key is granted on an earlier or equal floor", () => {
    const configs = {
      ...discoverableBase(),
      site: [
        [floor({ mainEndReward: { type: "tombKey", keyId: "k1" } }), floor({ sideSections: [tombKeyGate("k1")] })],
      ] as SiteConfig[],
    }
    expect(() => validateDiscovery(configs)).not.toThrow()
  })

  it("passes when the ward key is granted at a different, already-reachable site", () => {
    // Any site not in SECONDARY_TOMBS starts reachable, so a cross-site grant from one is always
    // fine — the mapPiece-discovery check above is what actually gates secondary-tomb reachability.
    const configs = {
      ...discoverableBase(),
      host: [[floor({ mainEndReward: { type: "tombKey", keyId: "k1" } })]] as SiteConfig[],
      gated: [[floor({ sideSections: [tombKeyGate("k1")] })]] as SiteConfig[],
    }
    expect(() => validateDiscovery(configs)).not.toThrow()
  })
})

describe("validateEconomyGuard", () => {
  const shopSlot = (shopPrice: number) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    endReward: { type: "mosaicPiece" as const },
    shopPrice,
  })
  const moneyPuzzleFloor = (amount: number) =>
    floor({ pathPuzzles: 1, puzzleRewards: [{ type: "money" as const, amount }] })
  const junkFloor = (itemId: string) => floor({ mainEndReward: { type: "sellable" as const, itemId } })

  it("passes when guaranteed income covers total shop prices + consumable stock", () => {
    // TOTAL_CONSUMABLE_BUYABLE alone is 1,760 — a single shop price of 100 needs 1,860 income.
    const configs = {
      site: [
        [
          floor({ sideSections: [shopSlot(100)] }),
          moneyPuzzleFloor(1000),
          moneyPuzzleFloor(1000),
          junkFloor("sell_divine_1"), // 50
        ],
      ] as SiteConfig[],
    }
    expect(() => validateEconomyGuard(configs)).not.toThrow()
  })

  it("throws when total shop prices + consumable stock exceed guaranteed income", () => {
    const configs = { site: [[floor({ sideSections: [shopSlot(100)] }), moneyPuzzleFloor(1)]] as SiteConfig[] }
    expect(() => validateEconomyGuard(configs)).toThrow(/economy guard failed/)
  })

  it("ignores non-shop end-of-path rewards when totaling shop prices", () => {
    // Exactly enough income for the fixed 1,760 consumable-stock floor, no shop prices —
    // a plain (non-shop) mosaicPiece endReward alongside it must not push the total over.
    const plainMosaic = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      endReward: { type: "mosaicPiece" as const },
    }
    const passingConfigs = {
      site: [[floor({ sideSections: [plainMosaic] }), moneyPuzzleFloor(1760)]] as SiteConfig[],
    }
    expect(() => validateEconomyGuard(passingConfigs)).not.toThrow()

    // Same income, but the mosaic now has a real shopPrice — must push the total over.
    const failingConfigs = {
      site: [[floor({ sideSections: [shopSlot(1)] }), moneyPuzzleFloor(1760)]] as SiteConfig[],
    }
    expect(() => validateEconomyGuard(failingConfigs)).toThrow(/economy guard failed/)
  })
})
