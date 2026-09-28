/**
 * Where a staircase stands, and the one place its id is spelled.
 *
 * A stair id is an identity, not a label: floor N's way up and floor N+1's way in carry the SAME id,
 * and that pairing is what `grid.staircases[id]` resolves (worldGen/reachability.ts, SiteMap's stair
 * travel). Two staircases that accidentally share an id therefore teleport a player to the wrong
 * floor, so the id has to name every level of the address a floor actually has — which journey, which
 * of its pyramids, which floor of that pyramid — before it says where on the floor the stairs are.
 *
 * Both `src/worldGen/` (which mints ids while growing the world) and `src/game/siteAssembler.ts`
 * (which fills one in where the authoring named none) build ids from here, so there is a single
 * spelling to change and no second formatter to drift away from it.
 */
export type StairAddress = {
  journeyId: string
  /** Which of the journey's pyramids — its level index, counted from 0. */
  pyramidIndex: number
  /** Which floor of that pyramid, counted from 0. */
  floorIndex: number
  /**
   * Where on the floor: `main` for the main path's way up, `entrance` for the floor's own way in, or
   * a section by its positional address — `s0`, `s0.1` — the vocabulary siteAssembler's chains and
   * save addresses already use.
   */
  path: string
}

export const stairIdAt = ({ journeyId, pyramidIndex, floorIndex, path }: StairAddress): string =>
  `${journeyId}:p${pyramidIndex}:f${floorIndex}:${path}`
