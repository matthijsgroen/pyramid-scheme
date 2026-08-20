import { TECHNIQUES, type TechniqueId } from "./techniques"

/**
 * What a tier may ask of a board, per docs/game-design/puzzles/futoshiki.md §5.2.
 *
 * This is a COARSER vocabulary than the solver's eleven techniques, and deliberately so: a pair and a
 * triple are the same idea at a different width, so a tier that says "this board needs a hidden
 * subset" should not care which width turns up. The hint layer still names the width — "these THREE
 * squares hold only 2, 5 and 7 between them" is a better sentence than any generic one — so the fold
 * lives here and nowhere else.
 */
export const DEMANDS = [
  "nakedSingle",
  "hiddenSingle",
  "signBound",
  "signVsValue",
  "signChain",
  "signPair",
  "nakedSubset",
  "hiddenSubset",
  "xWing",
] as const

export type DemandId = (typeof DEMANDS)[number]

/**
 * The techniques each demand stands for. The pairs and triples interleave in the solver's ladder
 * (naked pair, hidden pair, naked triple, hidden triple), which is why a tier's allowance has to be
 * a SET and not a depth: master wants naked subsets and not hidden ones, and no prefix of the ladder
 * says that.
 */
const COVERS: Record<DemandId, TechniqueId[]> = {
  nakedSingle: ["nakedSingle"],
  hiddenSingle: ["hiddenSingle"],
  signBound: ["signBound"],
  signVsValue: ["signVsValue"],
  signChain: ["signChain"],
  signPair: ["signPair"],
  nakedSubset: ["nakedPair", "nakedTriple"],
  hiddenSubset: ["hiddenPair", "hiddenTriple"],
  xWing: ["xWing"],
}

/** Which demand a technique answers to — how a solve's hardest step is read back as a tier's ask. */
export const demandOf = (technique: TechniqueId): DemandId =>
  DEMANDS.find(demand => COVERS[demand].includes(technique)) as DemandId

/**
 * Every technique a tier capped at `demand` may spend: that demand and every gentler one, kept in
 * ladder order so the solver still reaches for the cheapest reason that fires.
 */
export const techniquesFor = (demand: DemandId): TechniqueId[] => {
  const permitted = new Set(DEMANDS.slice(0, DEMANDS.indexOf(demand) + 1).flatMap(allowed => COVERS[allowed]))
  return TECHNIQUES.filter(technique => permitted.has(technique))
}
