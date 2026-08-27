import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateSudoku, gradeSudoku } from "./generateSudoku"
import { SUDOKU_CONFIG } from "./sudokuConfig"

export const SUDOKU_META: FamilyMeta = {
  id: "sudoku",
  ownerMod: "puzzle",
  // Setting each sign down once per row, column and chamber is the scribe's own discipline — a
  // register of names with nothing repeated (PUZZLE_FAMILIES.md §11.1) — and the same discipline is
  // what a wall of funerary signs is: §11.1's "Glyph Latin-square" under Tomb / Burial Logic is this
  // family. A tag is eligibility and nothing more, so carrying three costs the family nothing.
  tags: ["puzzle", "scribe", "funerary"],
  minTier: "starter",
  // Two faces on one board: values cut into stone, and six signs inked across a scribe's papyrus. A
  // site never names a skin, it names a role (docs/instructions/puzzle-screens.md §2) — the lab's
  // picker is what reads this list.
  themes: ["default", "papyrus"],
  icon: "🔢",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => SUDOKU_CONFIG[difficulty ?? "starter"],
    generate: generateSudoku,
    grade: gradeSudoku,
  }),
}
