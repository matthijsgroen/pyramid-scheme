import type { MoneySpec, JunkSpec } from "@/worldGen/dynamicLoot"
import { sellablesForDifficulty } from "@/data/sellables"
import type { Difficulty } from "@/data/difficultyLevels"

// Shop's loose-money placement: the density of puzzle slots that carry loose money. Global design
// target ~199/1714 puzzles. The amount is a core-ledger value (rollMoney); shop owns only how
// dense it is, so money placement drops with the shop mod.
export const SHOP_MONEY_SPEC: MoneySpec = { fraction: 199 / 1714 }

// Shop's junk (sellable) placement: how eager each slot kind is to bear junk — chests take all
// leftover junk, puzzle chains a fraction, the rest stay empty (docs/mods/SLICE-2-PLAN.md) — and
// the per-tier item set the dynamic pass round-robins over for ≥1-of-each completeness. Junk sell
// value funds the shop, so with shop off no junk is placed and leftover chests fall empty.
export const SHOP_JUNK_SPEC: JunkSpec = {
  eagerness: { end: 1, puzzle: 0.6 },
  itemsForTier: tier => sellablesForDifficulty(tier as Difficulty),
}
