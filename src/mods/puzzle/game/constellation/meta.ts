import type { FamilyMeta } from "@/game/families/familyMeta"

export const CONSTELLATION_META: FamilyMeta = {
  id: "constellation",
  ownerMod: "puzzle",
  // `sky` is the cluster a lighthouse or star-map journey draws from, and this is the star map that pool was
  // named for (docs/game-design/PUZZLE_FAMILIES.md §4.21). NOT `light`: that is the narrower pool for the
  // families about light itself — a beam bending, a sun and a moon — and lines between stars are not that.
  // Three pools, because the same rules describe three places: stars joined by light, sites joined by haul
  // roads, basins joined by channels. WHICH of them a room is comes from the role it was allocated for, not
  // from the family — see the skin table in app/constellation/ConstellationBoard.tsx.
  //
  // `water` is deliberately absent for now: it would be a pool of one, so a pyramid asking for water puzzles
  // would serve the same board in every room. It joins when a second water family exists.
  tags: ["puzzle", "sky", "trade"],
  // Configured for every tier (docs/game-design/puzzles/constellation.md §5), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  minTier: "starter",
  // Every skin this family has, listed for the puzzle lab: the lab picks a THEME, so naming a skin here is
  // what makes it playable without a site to author its role. `night` is the ambience, not a skin — it
  // layers over whichever place the room already is (a causeway after dark is still a causeway).
  themes: ["default", "irrigation", "causeway", "night"],
  icon: "✨",
  color: "indigo",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
