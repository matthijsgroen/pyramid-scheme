import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateHidato, gradeHidato } from "./generateHidato"
import { HIDATO_CONFIG } from "./hidatoConfig"

export const HIDATO_META: FamilyMeta = {
  id: "hidato",
  ownerMod: "puzzle",
  // A honeycomb is kept, not grown wild, so the hive sits in the same pools the flood plain does —
  // and counting a run of numbered cells is the scribe's act (PUZZLE_FAMILIES.md §11.1). The same
  // section reads the comb a fourth way, as sealed chambers, which is a tomb. A tag is eligibility and
  // nothing more, so carrying five costs the family nothing.
  tags: ["puzzle", "agriculture", "water", "scribe", "funerary"],
  // A kept hive by default, a channel across the flood plain, a scribe's sheet, a comb of sealed chambers.
  faces: {
    water: ["channel"],
    agriculture: ["channel"],
    scribe: ["scribe"],
    funerary: ["chambers"],
  },
  minTier: "starter",
  // A kept hive, a channel across the flood plain, a scribe's sheet and a tomb of sealed chambers — the
  // same board read four ways, so the lab can play all of them. A site never names a skin, it names a
  // role (docs/instructions/puzzle-screens.md §2).
  themes: ["default", "channel", "scribe", "chambers"],
  icon: "🍯",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => HIDATO_CONFIG[difficulty ?? "starter"],
    generate: generateHidato,
    grade: gradeHidato,
  }),
}
