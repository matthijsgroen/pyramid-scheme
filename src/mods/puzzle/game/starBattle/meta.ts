import type { FamilyMeta } from "@/game/families/familyMeta"

export const STAR_BATTLE_META: FamilyMeta = {
  id: "star-battle",
  ownerMod: "puzzle",
  // `sky` and nothing else. The catalogue is explicit that this mechanic does not read as several places
  // (PUZZLE_FAMILIES.md §4.24): counting stars per district is not a haul road or a waterworks, so unlike
  // constellation it carries one tag and wears one face. NOT `light` either — that is the narrower pool for
  // the families about light itself, and this one is about where things sit.
  tags: ["puzzle", "sky"],
  // Configured for every tier (docs/game-design/puzzles/star-battle.md §5).
  minTier: "starter",
  // One skin, and the design doc §9 says why: the name is the theme. A site authored `theme: "night"` gets
  // the same board, which is the eclipse arrangement — no roles, one ambience — rather than
  // constellation's.
  icon: "⭐",
  color: "indigo",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
