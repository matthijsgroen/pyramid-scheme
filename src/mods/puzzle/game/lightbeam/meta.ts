import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateLightbeam, gradeLightbeam } from "./generateLightbeam"
import { resolveLightbeamOptions } from "./lightbeamConfig"

export const LIGHTBEAM_META: FamilyMeta = {
  id: "lightbeam",
  ownerMod: "puzzle",
  // `sky` is the wider narrative cluster (sun, stars, anything a lighthouse journey wants); `light` is
  // the narrower one this family shares with eclipse. A journey asks for whichever pool it means.
  tags: ["puzzle", "light", "sky"],
  // Configured for every tier (docs/game-design/puzzles/lightbeam.md §6), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  // Beams of light read as both places already; this family has no skin system at all, so both answer with
  // the default until it gets one (journeys.md §9).
  faces: {
    sky: ["default"],
    light: ["default"],
  },
  minTier: "starter",
  // Modes a developer can force on top of a tier's own dials, to look at one shape at a time
  // (docs/instructions/puzzle-screens.md §6). "tier default" is what real play uses.
  variants: ["tier default", "wall-heavy", "slider-heavy", "switch-heavy", "sliding-wall"],
  icon: "🔆",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: resolveLightbeamOptions,
    generate: (seed, { size, ...options }, attempts) => generateLightbeam(size, seed, options, attempts),
    grade: gradeLightbeam,
  }),
}
