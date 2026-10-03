import type { FamilyMeta } from "@/game/families/familyMeta"
import { DOOR_FACE_ROLE } from "@/game/encounterFallback"

export const GATE_FACE_FAMILY = "gate-face"

// A DOOR'S READABLE FACE: stands in a gate that waits on several owners and tells the player which are
// lit. It reads and never opens, so it has no board, no reward and no place in any allocation pool — it
// is put on the door by the assembler, never authored or drawn from a role.
export const GATE_FACE_META: FamilyMeta = {
  id: GATE_FACE_FAMILY,
  ownerMod: "topology",
  tags: [DOOR_FACE_ROLE],
  icon: "🚪",
  color: "amber",
  rewardPriority: 0,
}
