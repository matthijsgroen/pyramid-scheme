import type { FamilyMeta } from "@/game/families/familyMeta"

// A TORCH IS A SWITCH THAT CAN ONLY BE LIT: the same mechanism a lever is (`FloorConfig.controls`, states
// `["unlit", "lit"]`, `returnsToInitial: false`), asked for by `encounter: "torch"`. A family of its own
// only because the arrival prompt's words belong to the family: lighting is not throwing.
export const TORCH_META: FamilyMeta = {
  id: "torch",
  ownerMod: "topology",
  tags: ["torch"],
  icon: "🔥",
  color: "amber",
  rewardPriority: 0,
  invitation: "torch.invitation",
  // Re-enterable so a player who walked past it unlit can come back and light it; once lit it offers
  // nothing (useSiteNavigation asks the mechanism, not this flag).
  reEnterable: true,
  stateIsTheMechanism: true,
  actsOnArrival: true,
}
