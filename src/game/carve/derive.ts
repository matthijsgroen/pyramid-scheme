import type { CarveState, Cell, FloorPrep } from "./state"

/** The lookups that follow from what passes decided: functions over state, never layers of their own. */

/** Each main-path cell's step along the route, by cell key. */
export const routeStepOf = (maze: Pick<Required<CarveState>["maze"], "mainPath">): ReadonlyMap<string, number> =>
  new Map(maze.mainPath.map(([r, c], step) => [`${r},${c}`, step]))

/** A cell's key, `r,c`. */
export const keyOf = ([r, c]: Cell) => `${r},${c}`

/** Where each main-path gate stands: on its seam, or where its run seated it, the run's word winning. */
export const gateIndexOf = (state: Pick<Required<CarveState>, "seamGates" | "runGates">): ReadonlyMap<string, number> =>
  new Map([...state.seamGates, ...state.runGates])

/** Every main-path step a gate took, the seam's and the run's alike. */
export const gateIndices = (state: Pick<Required<CarveState>, "seamGates" | "runGates">): ReadonlySet<number> =>
  new Set([...state.seamGates.values(), ...state.runGates.values()])

/** The laid nodes a section of the floor stands its rooms on: no mechanism's seat may take one. */
export const absorbedCell = (lay: CarveState["lay"]): ReadonlySet<string> =>
  new Set((lay?.laid.absorbed ?? []).flatMap(({ cells }) => cells))

/** The main path's content once every control has moved the puzzle it displaced, in the order it moved them. */
export const contentNow = (
  state: Pick<Required<CarveState>, "content" | "mainControls">
): { placed: readonly number[]; puzzleRole: ReadonlyMap<number, number> } => {
  const placed = [...state.content.placed]
  const puzzleRole = new Map(state.content.puzzleRole)
  for (const [from, to] of state.mainControls.moves) {
    placed[placed.indexOf(from)] = to
    puzzleRole.set(to, puzzleRole.get(from)!)
    puzzleRole.delete(from)
  }
  return { placed, puzzleRole }
}

/** The gate a lock laid on each cell, by the cell it stands on. */
export const gateAtCell = (lay: CarveState["lay"]): ReadonlyMap<string, string> =>
  new Map([...(lay?.laid.gateDoor ?? [])].map(([id, cell]) => [cell, id] as const))

/** Where each main-path control stands, by its step. */
export const controlAtIndex = (
  prep: Pick<FloorPrep, "mechanisms">,
  mainControls: Required<CarveState>["mainControls"]
): ReadonlyMap<number, FloorPrep["mechanisms"]["controlRecords"][number]> =>
  new Map(
    prep.mechanisms.controlRecords.flatMap(entry => {
      const step = mainControls.at.get(entry.control.id)
      return step === undefined ? [] : [[step, entry] as const]
    })
  )

/**
 * Every junction a branch hangs from, in the order the rooms are written: the route's, then a laid chain's,
 * then a laid junction whose only side arm closes a loop and so hangs no chain of its own.
 */
export const forkPositions = (state: Pick<Required<CarveState>, "branches" | "lay">): ReadonlySet<string> => {
  const laid = state.lay?.laid
  return new Set([
    ...state.branches.groups.map(g => keyOf(g.attachedAt)),
    ...(laid?.chains ?? []).flatMap(chain => (chain.attachedAt ? [keyOf(chain.attachedAt)] : [])),
    ...(laid?.junctions ?? []).map(junction => junction.cell),
  ])
}
