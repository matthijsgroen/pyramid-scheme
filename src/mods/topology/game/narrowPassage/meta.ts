import type { PassageRealisationMeta } from "@/game/passageRealisation"

// A NARROW PASSAGE IS A WALL WITH A CRACK in one corridor cell: a person squeezes through sideways, a stone does not.
// The crossing takes both hands, so a carrying walk stops beside it and says why.
export const NARROW_PASSAGE_META: PassageRealisationMeta = {
  id: "narrowPassage",
  ownerMod: "topology",
  prompt: "ui.prompt.squeeze",
  handsFull: true,
  art: { across: "narrowAcross", along: "narrowAlong" },
}
