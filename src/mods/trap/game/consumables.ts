import type { Distribution } from "@/worldGen/slotAllocator"
import { hashStr } from "@/worldGen/rewards"
import { rollConsumable } from "./consumableTypes"
import { difficultyCompare } from "@/data/difficultyLevels"

// Trap owns consumables (docs/mods/distribution-primitive-design.md): how many, which type
// (rarity), and where. Consumables sit only on expert+ PUZZLE slots — traps arrive at expert, so
// there's no reason to find trap supplies in the open early tiers, and chest ends stay money/junk.
// A slot's tier is its own section difficulty (Part B), so a low-tier ward path deep in a wizard
// tomb is still ineligible. Trap off → this distribution isn't registered → no consumables placed.
const RATES = { bandage: 3, oil: 1, trapTool: 1 }

// Design consumable count (tunable, feel-only — consumables don't enter the economy guard). The
// allocator hands the trap mod up to this many of the highest-ranked eligible slots; fewer if the
// world has fewer eligible expert+ puzzle slots (no hard-fail — min 0).
const CONSUMABLE_COUNT = 368

export const trapConsumables: Distribution = {
  id: "trap-consumables",
  eligible: slot => slot.kind === "puzzle" && slot.rewardPriority > 0 && difficultyCompare(slot.tier, "expert") >= 0,
  footprint: () => ({ min: 0, max: CONSUMABLE_COUNT }),
  // Spread deterministically across sites (seeded by slot identity) so consumables don't cluster in
  // whichever sites collectSlots happened to emit first. No Math.random — hashStr is a pure seed.
  rank: candidates =>
    [...candidates].sort((a, b) => hashStr(`${a.siteId}:${a.puzzleSeq}`) - hashStr(`${b.siteId}:${b.puzzleSeq}`)),
  fill: slots => {
    for (const slot of slots)
      slot.assign({
        type: "consumable",
        consumable: rollConsumable(`${slot.siteId}:consumable:${slot.puzzleSeq}`, RATES),
      })
  },
}

// Trap also stocks the Fez shops: every shop stock slot the currency mods didn't claim is filled
// with a FINITE consumable (no per-visit refresh — sold-out = sold-out; docs/mods/SLICE-shop-stock.md).
// Shop slots are rewardPriority 0 so the eager loot passes never touch them; this distribution
// targets them explicitly by encounter. The currency stock slots were already claimed (removed from
// `available`) by the capped/gating pass, so only the empty ones remain eligible here. Trap off →
// not registered → shop stock slots fall empty (the shop just sells fewer things).
export const trapShopStock: Distribution = {
  id: "trap-shop-consumables",
  eligible: slot => slot.encounter === "fez-shop",
  footprint: () => ({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  rank: candidates =>
    [...candidates].sort((a, b) => hashStr(`${a.siteId}:${a.puzzleSeq}`) - hashStr(`${b.siteId}:${b.puzzleSeq}`)),
  fill: slots => {
    for (const slot of slots)
      slot.assign({
        type: "consumable",
        consumable: rollConsumable(`${slot.siteId}:shopstock:${slot.puzzleSeq}`, RATES),
      })
  },
}
