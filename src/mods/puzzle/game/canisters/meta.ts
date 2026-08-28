import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateCanisters, gradeCanisters } from "./generateCanisters"
import { CANISTERS_CONFIG } from "./canistersConfig"

export const CANISTERS_META: FamilyMeta = {
  id: "canisters",
  ownerMod: "puzzle",
  // **Measuring is what six different places all do**, and this family has a face for each: the river, a
  // granary, a lamp room, a merchant's cellar, an embalming table and a scriptorium. A tag is eligibility
  // and nothing more, so carrying seven costs the family nothing — what it buys is that a journey asking
  // for any of them gets a board that looks like the place it is set in.
  //
  // `water` and `agriculture` are listed separately and MEAN separately here, which is true nowhere else
  // in the catalogue: every other family in that pool answers both with one face (app/canisters/skins.ts).
  tags: ["puzzle", "water", "agriculture", "light", "trade", "funerary", "scribe"],
  // The opening decision is modular arithmetic on two capacities; below junior a player is still being
  // taught what a pour does, and the design doc's starter tier hands them a move in hand to do it with.
  // Six places measure things out, and a wide role names more than one: a market moves oil, wine and
  // grain, and the rites take natron for the drying or oil for the anointing. Which of a set a room wears
  // is picked from its own board's shape (app/canisters/skins.ts).
  faces: {
    water: ["default"],
    agriculture: ["grain", "default"],
    light: ["oil"],
    scribe: ["ink"],
    trade: ["wine", "oil", "grain"],
    funerary: ["natron", "oil"],
  },
  minTier: "starter",
  // Two faces on one board would be an understatement: six places, each with its own vessel, ground and
  // way of behaving. A site never names a skin, it names a role (docs/instructions/puzzle-screens.md §2);
  // the lab's picker is what reads this list.
  themes: ["default", "grain", "oil", "wine", "natron", "ink"],
  icon: "🏺",
  color: "sky",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => CANISTERS_CONFIG[difficulty ?? "starter"],
    generate: generateCanisters,
    grade: gradeCanisters,
  }),
}
