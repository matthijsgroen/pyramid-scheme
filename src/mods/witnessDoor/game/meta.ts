import type { FamilyMeta } from "@/game/families/familyMeta"

export const WITNESS_DOOR_META: FamilyMeta = {
  id: "witnessDoor",
  ownerMod: "witnessDoor",
  tags: ["puzzle"],
  minTier: "junior",
  icon: "🪞",
  color: "amber",
  // Its reward is the shrine key it mints itself (Task 7 wires the mint) — never a slot the
  // generic loot pool may fill, the same reason a gate carries 0.
  rewardPriority: 0,
}
