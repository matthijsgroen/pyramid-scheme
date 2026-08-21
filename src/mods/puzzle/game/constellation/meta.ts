import type { FamilyMeta } from "@/game/families/familyMeta"

export const CONSTELLATION_META: FamilyMeta = {
  id: "constellation",
  ownerMod: "puzzle",
  // `sky` is the cluster a lighthouse or star-map journey draws from, and this is the star map that pool was
  // named for (docs/game-design/PUZZLE_FAMILIES.md §4.21). NOT `light`: that is the narrower pool for the
  // families about light itself — a beam bending, a sun and a moon — and lines between stars are not that.
  tags: ["puzzle", "sky"],
  // Configured for every tier (docs/game-design/puzzles/constellation.md §5), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  minTier: "starter",
  icon: "✨",
  color: "indigo",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
