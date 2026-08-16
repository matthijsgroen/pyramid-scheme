/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import { BALANCE_CONFIG } from "@/mods/puzzle/game/balanceScale/balanceConfig"
import {
  generateBalance,
  type BalancePuzzle as BalancePuzzleData,
} from "@/mods/puzzle/game/balanceScale/generateBalance"
import { BALANCE_META } from "@/mods/puzzle/game/balanceScale/meta"
import { isModEnabled } from "@/mods/registeredMods"
import { BalancePuzzle } from "./BalancePuzzle"

// Registered, so the puzzle lab can play it, but its meta is deliberately absent from the puzzle
// mod's family list — world-gen cannot allocate a family it never sees, which is what keeps an
// unapproved family out of the authored world (src/mods/puzzle/game/balanceScale/meta.ts).
const BalanceComponent: FamilyPlugin<BalancePuzzleData>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <BalancePuzzle puzzle={puzzle} difficulty={ctx.difficulty} onSolved={onSolved} onCancel={onCancel} />
)

export const generateBalanceFor = (difficulty: Difficulty | undefined, seed: number): BalancePuzzleData =>
  generateBalance(seed, BALANCE_CONFIG[difficulty ?? "starter"])

if (isModEnabled("puzzle"))
  registerFamily({
    meta: BALANCE_META,
    generate: (seed, ctx): BalancePuzzleData => generateBalanceFor(ctx.difficulty, seed),
    Component: BalanceComponent,
  })
