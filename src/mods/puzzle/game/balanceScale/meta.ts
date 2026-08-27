import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { BALANCE_CONFIG } from "./balanceConfig"
import { generateBalance, gradeBalance } from "./generateBalance"

export const BALANCE_META: FamilyMeta = {
  id: "balance-scale",
  ownerMod: "puzzle",
  // `trade` because weighing goods IS the merchant act (PUZZLE_FAMILIES.md §11.1) — a pyramid that asks
  // for trade puzzles draws this and the star map wearing its haul-road skin, which is what keeps a themed
  // pool from being a one-family pool.
  // Weighing goods is the merchant's act, and weighing a heart against the feather of truth is the same
  // scene in a tomb — PUZZLE_FAMILIES.md titles this family "§4.2 Balance scale (weighing of the heart)",
  // so the funerary reading is the one it started from. `judgement` is the narrow place inside `funerary`
  // (docs/game-design/journeys.md §9): this family is the only one that draws the weighing itself, and a
  // journey asks for the pair so the scale wears the scales while its neighbours wear the wider tomb.
  tags: ["puzzle", "trade", "funerary", "judgement"],
  // Two faces on one board: the merchant's own pieces, and the weighing of the heart — the same scale with
  // its unknowns drawn as the heart, the feather and what stands around them. A site never names a skin, it
  // names a role (docs/instructions/puzzle-screens.md §2); the lab's picker is what reads this list.
  themes: ["default", "weighing"],
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
