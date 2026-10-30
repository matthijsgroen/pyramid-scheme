import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generatePairPuzzle, gradePairPuzzle } from "./generatePairPuzzle"
import { PAIR_PUZZLE_CONFIG } from "./pairPuzzleConfig"

export const PAIR_PUZZLE_META: FamilyMeta = {
  id: "pair-puzzle",
  ownerMod: "puzzle",
  tags: ["puzzle", "funerary"],
  faces: { funerary: ["default"] },
  themes: ["default"],
  // The entry tier per docs/game-design/puzzles/pair-puzzle.md; the tier session may move it. Lab-only because
  // it is not in `puzzleMod.families`.
  minTier: "master",
  icon: "⚰️",
  color: "stone",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => PAIR_PUZZLE_CONFIG[difficulty ?? "master"],
    generate: generatePairPuzzle,
    grade: gradePairPuzzle,
  }),
  rewardPriority: 60,
}
