import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyGenerationCtx } from "@/game/families/familyMeta"
import type { SumpleteOptions } from "./generateSumplete"

export type SumpleteConfig = { size: number } & SumpleteOptions

// Tier settings, from docs/game-design/puzzles/sumplete.md §5. The technique cap is the real dial:
// it is what a board may DEMAND of the player, so a big grid that falls to counting alone stays easy
// and a small one that needs combinations does not. Sizes are paired to the cap that a board of that
// size can actually be generated under.
export const SUMPLETE_CONFIG: Record<Difficulty, SumpleteConfig> = {
  starter: { size: 4, techniqueCap: "parity" },
  junior: { size: 5, techniqueCap: "parity" },
  expert: { size: 6, techniqueCap: "onlyCombination" },
  master: { size: 7, techniqueCap: "onlyCombination" },
  // 7 wide is where a phone runs out: eight columns plus the target column at a thumb-sized tap
  // target is already the whole width of a 360px screen. So the top tier gains its difficulty from
  // the ladder, not from more cells.
  wizard: { size: 7, techniqueCap: "inEveryCombination" },
}

/**
 * The options one encounter builds its board from. Split out from the plugin so a build script with no
 * React can derive the same ones, and so their hash can key this tier's seed list
 * (docs/offline-puzzle-seeds.md).
 */
export const resolveSumpleteOptions = ({ difficulty }: FamilyGenerationCtx): SumpleteConfig =>
  SUMPLETE_CONFIG[difficulty ?? "starter"]
