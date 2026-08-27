/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import type { Difficulty } from "@/data/difficultyLevels"
import type { BalancePuzzle as BalancePuzzleData } from "@/mods/puzzle/game/balanceScale/generateBalance"
import { BALANCE_META } from "@/mods/puzzle/game/balanceScale/meta"
import { isModEnabled } from "@/mods/registeredMods"
import { BalancePuzzle } from "./BalancePuzzle"

const BalanceComponent: FamilyPlugin<BalancePuzzleData>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <BalancePuzzle
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    role={ctx.role}
    theme={ctx.theme}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

export const generateBalanceFor = (difficulty: Difficulty | undefined, seed: number): BalancePuzzleData =>
  generatePuzzle<BalancePuzzleData>(BALANCE_META, seed, { difficulty })

if (isModEnabled("puzzle"))
  registerFamily({
    meta: BALANCE_META,
    generate: (seed, ctx): BalancePuzzleData => generateBalanceFor(ctx.difficulty, seed),
    Component: BalanceComponent,
  })
