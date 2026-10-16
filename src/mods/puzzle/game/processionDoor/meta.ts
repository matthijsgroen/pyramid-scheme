import type { FamilyMeta } from "@/game/families/familyMeta"
import { castGlyphs } from "@/mods/puzzle/game/procession/casts"
import { PROCESSION_META } from "@/mods/puzzle/game/procession/meta"
import { doorVariant } from "@/mods/puzzle/game/procession/processionConfig"
import { PROCESSION_REALISATION } from "@/game/mechanics/sequence"

export const PROCESSION_DOOR_FAMILY = PROCESSION_REALISATION

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
  // 𓈖, the mark "water", reads as the cast's water carried (𓈗) at marker size.
  sequence: {
    glyphs: castGlyphs("default"),
    hidesOrder: true,
    resembles: ["𓈖".codePointAt(0)!],
    board: { family: PROCESSION_META.id, variant: doorVariant },
  },
}
