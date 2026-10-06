import type { FamilyMeta } from "@/game/families/familyMeta"

// A story beat standing in a room: somebody is here and has something to say. Never a challenge —
// it is read, not solved — so it carries no reward and is never a reward candidate.
export const CONVERSATION_META: FamilyMeta = {
  id: "conversation",
  ownerMod: "story",
  tags: ["story"],
  icon: "💬",
  color: "stone",
  rewardPriority: 0,
}
