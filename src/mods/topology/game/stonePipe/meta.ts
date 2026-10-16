import type { FamilyMeta } from "@/game/families/familyMeta"

export const STONE_PIPE_FAMILY = "stonePipe"

// A STONE PIPE IS A LOCK'S PIPE REALISED AS TWO HOLES IN THE WALLS: a stone posted at one lies in the other. Like the
// stone plate it has no board, no reward and no place in any pool, and is never drawn from a role. It is what a
// pipe binds to (`realisations: { pipe: "stonePipe" }`); a hole is read from the cell's own `pipeHole`, and drawn
// in the shared art the map names for it (src/app/SiteMap/pipeHoleArt.ts), as a plate is.
export const STONE_PIPE_META: FamilyMeta = {
  id: STONE_PIPE_FAMILY,
  ownerMod: "topology",
  tags: ["stonePipe"],
  icon: "🕳️",
  color: "stone",
  rewardPriority: 0,
}
