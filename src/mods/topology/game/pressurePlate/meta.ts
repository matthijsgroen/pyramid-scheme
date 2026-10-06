import type { FamilyMeta } from "@/game/families/familyMeta"

export const PRESSURE_PLATE_FAMILY = "pressure-plate"

// A PRESSURE PLATE IS A SEQUENCE REALISED AS TILES ON THE FLOOR: stepping on one is the whole of the move, so it
// has no board, no reward and no place in any pool, and is never drawn from a role. It is what a sequence binds
// to (`realisations: { sequence: "pressure-plate" }`); the plates are drawn from the cell's own `sequenceTile`
// (the `plate` node shape), so the family holds no drawing and no component of its own.
export const PRESSURE_PLATE_META: FamilyMeta = {
  id: PRESSURE_PLATE_FAMILY,
  ownerMod: "topology",
  tags: ["plate"],
  icon: "🪨",
  color: "amber",
  rewardPriority: 0,
}
