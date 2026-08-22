import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { FUTOSHIKI_CONFIG } from "./futoshikiConfig"
import { generateFutoshiki, gradeFutoshiki } from "./generateFutoshiki"

export const FUTOSHIKI_META: FamilyMeta = {
  id: "futoshiki",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  minTier: "starter",
  icon: "⚖️",
  color: "amber",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: ({ difficulty }) => FUTOSHIKI_CONFIG[difficulty ?? "starter"],
    generate: (seed, { size, ...options }, attempts) => generateFutoshiki(size, seed, options, attempts),
    grade: gradeFutoshiki,
  }),
}
