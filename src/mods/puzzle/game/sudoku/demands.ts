import { TECHNIQUES, type TechniqueId } from "./techniques"

/**
 * What a tier may ask of a board, per docs/game-design/puzzles/sudoku.md §5.2.
 *
 * COARSER than the solver's four techniques, and deliberately so: pointing and claiming are one idea
 * read from either side, so a tier that says "this board needs a chamber-line reason" should not care
 * which way round it turned up. The hint layer still names the exact rung — a sentence about a chamber
 * and a sentence about a row are different sentences — so the fold lives here and nowhere else.
 */
export const DEMANDS = ["nakedSingle", "hiddenSingle", "boxLine"] as const

export type DemandId = (typeof DEMANDS)[number]

/** The techniques each demand stands for. */
const COVERS: Record<DemandId, TechniqueId[]> = {
  nakedSingle: ["nakedSingle"],
  hiddenSingle: ["hiddenSingle"],
  boxLine: ["pointing", "claiming"],
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

/**
 * Everything gentler than `demand`, which is the ladder a board demanding it must NOT fall to.
 *
 * "This board needs a chamber-line reason" is exactly "the singles alone leave it standing", and that
 * is the only form of the claim a generator can act on: reading back the hardest step a solve HAPPENED
 * to take says nothing, because a cheapest-first solver takes the dear step only where the cheap ones
 * have run out. Empty for the gentlest rung, which nothing can be said to need.
 */
export const techniquesBelow = (demand: DemandId): TechniqueId[] => {
  const index = DEMANDS.indexOf(demand)
  return index <= 0 ? [] : techniquesFor(DEMANDS[index - 1])
}
