import { describe, expect, it } from "vitest"
import type { SiteConfig } from "@/worldGen/types"
import type { TreasureReward } from "@/game/siteTypes"
import { mosaicReachabilityValidator, reachableMosaicCounts } from "./mosaicReachability"
import { MOSAIC_STEPS_BY_TIER, MOSAIC_TIERS, type MosaicTier } from "./mosaicCurrency"
import { mosaicMod } from ".."

const noConfigs: Record<string, SiteConfig[]> = {}

const glass = (tier: MosaicTier, count: number): TreasureReward[] =>
  Array.from({ length: count }, () => ({ type: "mosaicPiece", tier }))

// Every register filled to its own target, which is what the shipped world must hand the guard.
const fullWorld = (): TreasureReward[] => MOSAIC_TIERS.flatMap(tier => glass(tier, MOSAIC_STEPS_BY_TIER[tier]))

describe(reachableMosaicCounts, () => {
  it("counts each register's own pieces and nothing else", () => {
    const counts = reachableMosaicCounts([
      ...glass("starter", 2),
      ...glass("wizard", 1),
      { type: "hieroglyphFragment", hieroglyphId: "ra" },
      { type: "money", amount: 5 },
    ])
    expect(counts).toEqual({ starter: 2, junior: 0, expert: 0, master: 0, wizard: 1 })
  })
})

describe(mosaicReachabilityValidator, () => {
  it("passes when every register's target count stands in reachable ground", () => {
    expect(() => mosaicReachabilityValidator(noConfigs, fullWorld())).not.toThrow()
  })

  it("throws naming the register and its shortfall when one register is a single piece short", () => {
    const oneShort = fullWorld().filter((_, i) => i !== 0)
    expect(() => mosaicReachabilityValidator(noConfigs, oneShort)).toThrow(
      new RegExp(`starter: ${MOSAIC_STEPS_BY_TIER.starter - 1}/${MOSAIC_STEPS_BY_TIER.starter}`)
    )
  })

  it("throws on a world whose mosaic TOTAL is exactly right but whose junior register is short and wizard over", () => {
    const traded = [
      ...glass("starter", MOSAIC_STEPS_BY_TIER.starter),
      ...glass("junior", MOSAIC_STEPS_BY_TIER.junior - 1),
      ...glass("expert", MOSAIC_STEPS_BY_TIER.expert),
      ...glass("master", MOSAIC_STEPS_BY_TIER.master),
      ...glass("wizard", MOSAIC_STEPS_BY_TIER.wizard + 1),
    ]
    expect(traded).toHaveLength(Object.values(MOSAIC_STEPS_BY_TIER).reduce((s, n) => s + n, 0))
    expect(() => mosaicReachabilityValidator(noConfigs, traded)).toThrow(/junior:/)
  })

  it("names every short register at once, not just the first", () => {
    expect(() => mosaicReachabilityValidator(noConfigs, [])).toThrow(
      new RegExp(MOSAIC_TIERS.map(t => `${t}: 0/${MOSAIC_STEPS_BY_TIER[t]}`).join(", "))
    )
  })

  it("is the mosaic mod's own world validator, so the world build runs it and it leaves with the mod", () => {
    expect(mosaicMod.worldValidator).toBe(mosaicReachabilityValidator)
  })

  it("does not credit a register for glass of another tier", () => {
    const allStarter = glass(
      "starter",
      Object.values(MOSAIC_STEPS_BY_TIER).reduce((s, n) => s + n, 0)
    )
    expect(() => mosaicReachabilityValidator(noConfigs, allStarter)).toThrow(/wizard: 0\//)
  })
})
