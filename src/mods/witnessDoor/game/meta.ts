import type { FamilyMeta } from "@/game/families/familyMeta"

export const WITNESS_DOOR_META: FamilyMeta = {
  id: "witnessDoor",
  ownerMod: "witnessDoor",
  // Its own tag, not "puzzle": a room drawn into the generic puzzle pool would let a player open a
  // shrine that gates nothing it was routed to, minting a key nothing consumes. This family is
  // placed only where a pyramid authors it by id (docs/game-design/floor-as-puzzle-brainstorm.md)
  // — the same reason crocodile stays out of the generic pool with its own "capstone" tag.
  tags: ["witnessDoor"],
  minTier: "junior",
  icon: "🪞",
  color: "amber",
  // Its reward is a key it mints itself, never a slot the generic loot pool may fill — the same
  // reason a gate carries 0.
  rewardPriority: 0,
}
