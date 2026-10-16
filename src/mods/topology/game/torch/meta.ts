import type { FamilyMeta } from "@/game/families/familyMeta"

// THE STANDING TORCH dresses two control kinds: the flame (off until lit; water or sand over its region puts it out)
// and the activator (off then on for good). States `off` and `on`, asked for by `encounter: "torch"`. A family of its
// own only because the arrival prompt's words belong to the family: lighting is not throwing.
export const TORCH_META: FamilyMeta = {
  id: "torch",
  ownerMod: "topology",
  tags: ["torch"],
  icon: "🔥",
  color: "amber",
  // The standing torch is shared art, the same at every rank; the marker carrying the flame still says
  // which room it is and whether it is lit.
  drawing: { marker: "mechanism", art: "standingTorch" },
  rewardPriority: 0,
  invitation: "torch.invitation",
  // Re-enterable so a player who walked past it unlit can come back and light it; once lit it offers
  // nothing (useSiteNavigation asks the mechanism, not this flag).
  reEnterable: true,
  stateIsTheMechanism: true,
  actsOnArrival: true,
}
