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
  // A shop = a section whose encounter resolved to fez-shop, its stock in `rewards[]`. The guard
  // prices that stock via priceFor (mosaicPiece = 500). A plain (non-shop) endReward isn't buyable.
  const shop = (rewards: { type: string }[]) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    encounter: "fez-shop" as const,
    rewards,
  })
  const moneyPuzzleFloor = (amount: number) => floor({ pathPuzzles: 1, rewards: [{ type: "money" as const, amount }] })

  it("passes when guaranteed income covers the shop stock's value", () => {
    // One shop mosaicPiece = 500; income 1000 covers it.
    const configs = {
      site: [[floor({ sideSections: [shop([{ type: "mosaicPiece" }])] }), moneyPuzzleFloor(1000)]] as SiteConfig[],
    }
    expect(() => runEconomyGuard(configs)).not.toThrow()
  })

  it("throws when the shop stock's value exceeds guaranteed income", () => {
    const configs = {
      site: [[floor({ sideSections: [shop([{ type: "mosaicPiece" }])] }), moneyPuzzleFloor(1)]] as SiteConfig[],
    }
    expect(() => runEconomyGuard(configs)).toThrow(/economy guard failed/)
  })

  it("ignores a non-shop end-of-path reward when totaling buyable stock", () => {
    // A plain mosaicPiece endReward (no fez-shop encounter) isn't buyable → buyable 0, always passes.
    const plainMosaic = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      endReward: { type: "mosaicPiece" as const },
    }
    const passingConfigs = { site: [[floor({ sideSections: [plainMosaic] }), moneyPuzzleFloor(0)]] as SiteConfig[] }
    expect(() => runEconomyGuard(passingConfigs)).not.toThrow()

    // The same mosaicPiece as shop stock IS buyable (500) → exceeds the 0 income.
    const failingConfigs = {
      site: [[floor({ sideSections: [shop([{ type: "mosaicPiece" }])] }), moneyPuzzleFloor(0)]] as SiteConfig[],
    }
    expect(() => runEconomyGuard(failingConfigs)).toThrow(/economy guard failed/)
  })
})
