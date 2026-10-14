import type { FamilyMeta } from "@/game/families/familyMeta"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"

export const PROCESSION_DOOR_FAMILY = "procession-door"

// A PROCESSION DOOR IS A SEQUENCE WHOSE DOOR CARRIES A PROCESSION BOARD: each tile wears a doing of the default cast,
// stepping on it unlocks its bar, and the door opens once the board is solved and the rooms are walked in the
// order it teaches. Like the pressure plate it has no pool and no reward; the lock word `procession` binds it.
// The default cast because it shares no sign with the mark glyphs (docs/instructions/procession-door.md).
export const PROCESSION_DOOR_META: FamilyMeta = {
  id: PROCESSION_DOOR_FAMILY,
  ownerMod: "puzzle",
  tags: ["procession-door"],
  icon: "⏳",
  color: "teal",
  rewardPriority: 0,
  sequence: { glyphs: castGlyphs("default"), hidesOrder: true },
}
