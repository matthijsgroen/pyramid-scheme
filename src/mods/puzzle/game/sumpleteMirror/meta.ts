import type { FamilyMeta } from "@/game/families/familyMeta"

// Acceptance-demo family for the tag-based encounter allocator (§A.3): a second family carrying
// the "puzzle" tag. Its only purpose is to prove the allocator spreads puzzle slots across every
// tag-matching family with zero edits to the allocator, specs, or siteAssembler. Same mechanic as
// sumplete for now — a real second puzzle family (or a themed variant) would replace it.
export const SUMPLETE_MIRROR_META: FamilyMeta = {
  id: "sumplete-mirror",
  ownerMod: "puzzle",
  tags: ["puzzle"],
  minTier: "starter",
  icon: "🪞",
  color: "purple",
  rewardWeight: 60,
}
