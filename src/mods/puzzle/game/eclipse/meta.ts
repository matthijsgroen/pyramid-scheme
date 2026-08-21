import type { FamilyMeta } from "@/game/families/familyMeta"

export const ECLIPSE_META: FamilyMeta = {
  id: "eclipse",
  ownerMod: "puzzle",
  // `light` is the narrow pool it shares with lightbeam; `sky` is the wider cluster a lighthouse or
  // star-map journey draws from. Authoring asks for a tag and the allocator draws from whatever carries
  // it — no journey ever names a family.
  tags: ["puzzle", "light", "sky"],
  minTier: "starter",
  icon: "🌘",
  color: "sky",
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
