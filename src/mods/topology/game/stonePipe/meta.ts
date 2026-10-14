import type { FamilyMeta } from "@/game/families/familyMeta"

export const STONE_PIPE_FAMILY = "stonePipe"

/** The shared tiles (`tiles/default/<key>.png`) a hole is drawn with: empty, and with a stone lying in it. */
export const STONE_PIPE_ART = { empty: "pipeHole", stone: "pipeHoleStone" } as const

// A STONE PIPE IS A LOCK'S PIPE REALISED AS TWO HOLES IN THE WALLS: a stone posted at one lies in the other. Like the
// stone plate it has no board, no reward and no place in any pool, and is never drawn from a role. It is what a
// pipe binds to (`realisations: { pipe: "stonePipe" }`); a hole is read from the cell's own `pipeHole`.
export const STONE_PIPE_META: FamilyMeta = {
  id: STONE_PIPE_FAMILY,
  ownerMod: "topology",
  tags: ["stonePipe"],
  icon: "🕳️",
  color: "stone",
  rewardPriority: 0,
}
