import type { FamilyMeta } from "@/game/families/familyMeta"

export const LIGHTBEAM_META: FamilyMeta = {
  id: "lightbeam",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  // Configured for every tier (docs/game-design/puzzles/lightbeam.md §6), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  minTier: "starter",
  // Modes a developer can force on top of a tier's own dials, to look at one shape at a time
  // (docs/instructions/puzzle-screens.md §6). "tier default" is what real play uses.
  variants: ["tier default", "wall-heavy", "slider-heavy", "switch-heavy"],
  icon: "🔆",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
