import type { FamilyMeta } from "@/game/families/familyMeta"

export const STONE_PLATE_FAMILY = "stonePlate"

// A STONE PLATE IS A LOCK'S STONES REALISED AS PLATES ON THE FLOOR: a stone is lifted off one and set on another,
// so it has no board, no reward and no place in any pool, and is never drawn from a role. It is what the stones
// bind to (`realisations: { weights: "stonePlate" }`); the plates are read from the cell's own `plate`, so the
// family holds no drawing and no component of its own.
export const STONE_PLATE_META: FamilyMeta = {
  id: STONE_PLATE_FAMILY,
  ownerMod: "topology",
  tags: ["stonePlate"],
  icon: "🪨",
  color: "amber",
  rewardPriority: 0,
}
