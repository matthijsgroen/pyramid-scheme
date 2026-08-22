import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { generateSumplete, gradeSumplete } from "./generateSumplete"
import { resolveSumpleteOptions } from "./sumpleteConfig"

export const SUMPLETE_META: FamilyMeta = {
  id: "sumplete",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  minTier: "starter",
  icon: "🔢",
  color: "blue",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
  seedable: seedable({
    resolveOptions: resolveSumpleteOptions,
    generate: (seed, { size, ...options }, attempts) => generateSumplete(size, seed, options, attempts),
    grade: gradeSumplete,
  }),
}
