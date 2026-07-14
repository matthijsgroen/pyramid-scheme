import type { Distribution } from "@/worldGen/slotAllocator"
import { rollConsumable, hashStr } from "@/worldGen/rewards"
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
  eligible: slot => slot.kind === "puzzle" && slot.rewardWeight > 0 && difficultyCompare(slot.tier, "expert") >= 0,
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
