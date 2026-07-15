import type { FamilyMeta } from "@/game/families/familyMeta"

export const KEY_GATE_META: FamilyMeta = {
  id: "key-gate",
  ownerMod: "core",
  tags: ["gate"],
  icon: "🔒",
  color: "amber",
  rewardPriority: 0, // demand, not a reward — never eligible for the reward-weight fill
}
