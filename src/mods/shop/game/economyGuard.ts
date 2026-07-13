import type { SideSection, SiteConfig, SubSection } from "@/worldGen/types"
import type { WorldValidator } from "@/worldGen/validate"
import { TOTAL_CONSUMABLE_BUYABLE } from "@/data/shopPricing"
import { sellValueForItemId } from "@/data/sellables"

// Economy guard: Σ(all shop prices, rares + one full consumable restock per shop) ≤
// Σ(all guaranteed income — puzzle-solve money + junk sell value).
// Global cumulative, not per-tier — shops are revisitable, so backtracking makes any
// order affordable; only the world-wide totals matter. Throws at build, not at runtime.
// Shop-owned: injected as the shop mod's worldValidator, so the check drops out when shop
// leaves REGISTERED_MODS. This is a hand-walked, shop-specific version of a more general
// "dependency read as guard" mechanism docs/mods/ARCHITECTURE.md describes — not generalizing
// yet; a pointer for whoever does.
export const runEconomyGuard = (allConfigs: Record<string, SiteConfig[]>): void => {
  let shopPrices = 0
  let guaranteedIncome = 0

  const tallySubSection = (s: SubSection) => {
    if (s.shopPrice !== undefined) shopPrices += s.shopPrice
    if (s.endReward?.type === "sellable") guaranteedIncome += sellValueForItemId(s.endReward.itemId)
    for (const r of s.puzzleRewards ?? []) {
      if (r?.type === "money") guaranteedIncome += r.amount
    }
  }
  const walkSection = (s: SideSection) => {
    tallySubSection(s)
    for (const sub of s.sideSections ?? []) tallySubSection(sub)
  }

  for (const siteConfigs of Object.values(allConfigs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        if (floor.mainEndReward?.type === "sellable") guaranteedIncome += sellValueForItemId(floor.mainEndReward.itemId)
        for (const r of floor.puzzleRewards ?? []) {
          if (r?.type === "money") guaranteedIncome += r.amount
        }
        for (const s of floor.sideSections) walkSection(s)
      }
    }
  }

  const totalBuyable = shopPrices + TOTAL_CONSUMABLE_BUYABLE
  if (totalBuyable > guaranteedIncome) {
    throw new Error(
      `[worldSpec] Shop economy guard failed: total buyable (${totalBuyable} = ${shopPrices} rares + ` +
        `${TOTAL_CONSUMABLE_BUYABLE} consumable stock) exceeds guaranteed income (${guaranteedIncome}).`
    )
  }
}

// The guard is a global balance check — it can't pass until the whole world is grown, so it
// blocks mid-exercise regeneration during world authoring. SKIP_ECONOMY_GUARD lets an author
// iterate + inspect (yarn world-info) with structural validation still on; the real
// generate-world for commit must run without it. ponytail: env escape hatch, not a config knob.
export const shopEconomyGuard: WorldValidator = allConfigs => {
  if (process.env.SKIP_ECONOMY_GUARD) return
  runEconomyGuard(allConfigs)
}
