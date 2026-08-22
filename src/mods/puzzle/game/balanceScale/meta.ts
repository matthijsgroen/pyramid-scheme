import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { BALANCE_CONFIG } from "./balanceConfig"
import { generateBalance, gradeBalance } from "./generateBalance"

export const BALANCE_META: FamilyMeta = {
  id: "balance-scale",
  ownerMod: "puzzle",
  // `trade` because weighing goods IS the merchant act (PUZZLE_FAMILIES.md §11.1) — a pyramid that asks
  // for trade puzzles draws this and the star map wearing its haul-road skin, which is what keeps a themed
  // pool from being a one-family pool.
  tags: ["puzzle", "trade"],
  // Debuts at T1 (PUZZLE_FAMILIES.md §4.2), and its own starter board is two glyphs on two scales with
  // a number to share out, so it enters at the bottom of its own scale wherever the allocator drops
  // it (P4).
  minTier: "starter",
  icon: "⚖️",
  color: "purple",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => BALANCE_CONFIG[difficulty ?? "starter"],
    generate: generateBalance,
    grade: gradeBalance,
  }),
}
