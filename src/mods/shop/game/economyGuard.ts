import type { SideSection, SiteConfig, SubSection, TreasureReward } from "@/worldGen/types"
import type { WorldValidator } from "@/worldGen/validate"
import { TOTAL_CONSUMABLE_BUYABLE } from "@/data/shopPricing"
import { sellValueForItemId } from "@/data/sellables"
import { moneyRewardSchema, sellableRewardSchema } from "./rewardSchemas"

// Σ of every authored shop price across the world. The shop's money economy needs the player to be
// able to afford this (+ a full consumable restock per shop) — it's the floor the loot budget
// targets (see loot.ts) and the number the economy guard checks income against. One walk, one
// source, shared by both so they can never drift.
export const totalBuyable = (allConfigs: Record<string, SiteConfig[]>): number => {
  let shopPrices = 0
  const tally = (s: SubSection) => {
    if (s.shopPrice !== undefined) shopPrices += s.shopPrice
  }
  for (const siteConfigs of Object.values(allConfigs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        for (const s of floor.sideSections) {
          tally(s)
          for (const sub of s.sideSections ?? []) tally(sub)
        }
      }
    }
  }
  return shopPrices + TOTAL_CONSUMABLE_BUYABLE
}

// Economy guard: Σ(all shop prices, rares + one full consumable restock per shop) ≤
// Σ(all guaranteed income — puzzle-solve money + junk sell value).
// Global cumulative, not per-tier — shops are revisitable, so backtracking makes any
// order affordable; only the world-wide totals matter. Throws at build, not at runtime.
// Shop-owned: injected as the shop mod's worldValidator, so the check drops out when shop
// leaves REGISTERED_MODS. This is a hand-walked, shop-specific version of a more general
// "dependency read as guard" mechanism docs/mods/ARCHITECTURE.md describes — not generalizing
// yet; a pointer for whoever does.
export const runEconomyGuard = (allConfigs: Record<string, SiteConfig[]>): void => {
  let guaranteedIncome = 0

  // Income = every placed money coin + every junk item's sell value, wherever it sits. The shop's
  // money economy mixes both across end AND puzzle slots (junk = packaged money), so both reward
  // types count in both positions — not the old "sellables in chests, money in puzzles" split.
  const addReward = (r: TreasureReward | undefined) => {
    if (r?.type === "money") guaranteedIncome += moneyRewardSchema.parse(r).amount
    else if (r?.type === "sellable") guaranteedIncome += sellValueForItemId(sellableRewardSchema.parse(r).itemId)
  }
  const tallySubSection = (s: SubSection) => {
    addReward(s.endReward)
    for (const r of s.puzzleRewards ?? []) addReward(r)
  }
  const walkSection = (s: SideSection) => {
    tallySubSection(s)
    for (const sub of s.sideSections ?? []) tallySubSection(sub)
  }

  for (const siteConfigs of Object.values(allConfigs)) {
    for (const floors of siteConfigs) {
      for (const floor of floors) {
        addReward(floor.mainEndReward)
        for (const r of floor.puzzleRewards ?? []) addReward(r)
        for (const s of floor.sideSections) walkSection(s)
      }
    }
  }

  const buyable = totalBuyable(allConfigs)
  if (buyable > guaranteedIncome) {
    throw new Error(
      `[worldSpec] Shop economy guard failed: total buyable (${buyable}, incl. ` +
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
