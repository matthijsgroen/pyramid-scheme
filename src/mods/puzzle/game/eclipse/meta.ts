import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { ECLIPSE_CONFIG } from "./eclipseConfig"
import { generateEclipse, gradeEclipse } from "./generateEclipse"

export const ECLIPSE_META: FamilyMeta = {
  id: "eclipse",
  ownerMod: "puzzle",
  // `light` is the narrow pool it shares with lightbeam; `sky` is the wider cluster a lighthouse or
  // star-map journey draws from. Authoring asks for a tag and the allocator draws from whatever carries
  // it — no journey ever names a family.
  tags: ["puzzle", "light", "sky"],
  // Sun and moon read as both places without dressing as either, so both answer with the default. Its
  // `night` pair is an AMBIENCE and deliberately not in here: the two axes do not share a field.
  faces: {
    sky: ["default"],
    light: ["default"],
  },
  minTier: "starter",
  // The skins this family has (docs/instructions/puzzle-screens.md §2): the default sun-and-moon pair, and
  // star-and-dark-sky for a site authored `theme: "night"`. Listed so the puzzle lab can offer both.
  themes: ["default", "night"],
  icon: "🌘",
  color: "sky",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => ECLIPSE_CONFIG[difficulty ?? "starter"],
    generate: generateEclipse,
    grade: gradeEclipse,
  }),
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
