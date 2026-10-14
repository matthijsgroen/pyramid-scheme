import type { CarveState, Cell } from "./state"

/** The lookups that follow from what passes decided: functions over state, never layers of their own. */

/** Each main-path cell's step along the route, by cell key. */
export const routeStepOf = (maze: Pick<Required<CarveState>["maze"], "mainPath">): ReadonlyMap<string, number> =>
  new Map(maze.mainPath.map(([r, c], step) => [`${r},${c}`, step]))

/** A cell's key, `r,c`. */
export const keyOf = ([r, c]: Cell) => `${r},${c}`
