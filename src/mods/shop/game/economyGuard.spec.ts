import { describe, expect, it } from "vitest"
import { runEconomyGuard } from "./economyGuard"
import type { FloorConfig, SiteConfig } from "@/worldGen/types"

const floor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

describe("runEconomyGuard", () => {
  const shopSlot = (shopPrice: number) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    endReward: { type: "mosaicPiece" as const },
    shopPrice,
  })
  const moneyPuzzleFloor = (amount: number) => floor({ pathPuzzles: 1, rewards: [{ type: "money" as const, amount }] })
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
    expect(() => runEconomyGuard(configs)).not.toThrow()
  })

  it("throws when total shop prices + consumable stock exceed guaranteed income", () => {
    const configs = { site: [[floor({ sideSections: [shopSlot(100)] }), moneyPuzzleFloor(1)]] as SiteConfig[] }
    expect(() => runEconomyGuard(configs)).toThrow(/economy guard failed/)
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
    expect(() => runEconomyGuard(passingConfigs)).not.toThrow()

    // Same income, but the mosaic now has a real shopPrice — must push the total over.
    const failingConfigs = {
      site: [[floor({ sideSections: [shopSlot(1)] }), moneyPuzzleFloor(1760)]] as SiteConfig[],
    }
    expect(() => runEconomyGuard(failingConfigs)).toThrow(/economy guard failed/)
  })
})
