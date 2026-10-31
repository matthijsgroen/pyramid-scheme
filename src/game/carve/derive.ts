import { crossesNoDoor } from "../obstacles"
import type { Direction } from "../siteTypes"
import { CONNECTOR_DIRS, makePkey } from "./grid"
import type { CarveState, Cell, FloorPrep, RoomSpec } from "./state"

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
 * then a laid junction whose only side arm closes a loop and so hangs no chain of its own. A designed room's ports are
 * no forks: its ways part on its own floor, at its anchor.
 */
export const forkPositions = (state: Pick<Required<CarveState>, "branches" | "lay">): ReadonlySet<string> => {
  const laid = state.lay?.laid
  const roomFloor = new Set((laid?.blocks ?? []).flatMap(block => block.nodes.filter(node => node !== block.anchor)))
  return new Set(
    [
      ...state.branches.groups.map(g => keyOf(g.attachedAt)),
      ...(laid?.chains ?? []).flatMap(chain => (chain.attachedAt ? [keyOf(chain.attachedAt)] : [])),
      ...(laid?.junctions ?? []).map(junction => junction.cell),
    ].filter(key => !roomFloor.has(key))
  )
}

/** The region-barrier door a lock laid on each cell, by the cell it stands on. */
export const regionDoorAt = (lay: CarveState["lay"]) =>
  new Map((lay?.laid.regionDoors ?? []).map(door => [door.cell, door] as const))

/** Whether two nodes are joined: by the maze, or by a passage a branch carved. */
export const hasPassage = (state: Pick<Required<CarveState>, "maze" | "branches">, key: string): boolean =>
  state.maze.passages.has(key) || state.branches.carved.has(key)

/** The doors a reserved junction's switch shuts, by the cells behind them, once `shutSwitchGround` has run. */
type SwitchDoors = ReadonlyMap<string, ReadonlySet<string>>

const NOTHING: ReadonlySet<string> = new Set()

/**
 * The doors between the way in and a cell — empty for ground the player reaches unimpeded. The authored ones,
 * then a switch's where `switchDoors` is given: a pass before `shutSwitchGround` sees the floor without them.
 */
export const standsBehind =
  (doors: Required<CarveState>["doors"], switchDoors?: SwitchDoors) =>
  (cellKey: string): ReadonlySet<string> => {
    const shut = switchDoors?.get(cellKey)
    const own = doors.behind.get(cellKey)
    if (!shut) return own ?? NOTHING
    return new Set([...(own ?? []), ...shut])
  }

/** The seams between the way in and a cell, gated or not. */
const standsBehindSeam =
  (doors: Required<CarveState>["doors"]) =>
  (cellKey: string): ReadonlySet<string> =>
    doors.seamBehind.get(cellKey) ?? NOTHING

type DoorView = Pick<Required<CarveState>, "maze" | "branches" | "doors" | "lay">

/**
 * Whether the passage between two neighbouring nodes may stand open: one a chain walked, or a leftover maze
 * edge that goes round no door — neither an authored one nor a seam the layout declares.
 */
export const edgeAllowed = (state: DoorView, switchDoors?: SwitchDoors) => {
  const { intended, gated, ground, seamGated } = state.doors
  const pkey = makePkey(state.maze.n)
  const behind = standsBehind(state.doors, switchDoors)
  const behindSeam = standsBehindSeam(state.doors)
  return (r: number, c: number, nr: number, nc: number): boolean => {
    const key = pkey(r, c, nr, nc)
    if (!hasPassage(state, key)) return false
    if (intended.has(key)) return true
    const hereKey = `${r},${c}`
    const thereKey = `${nr},${nc}`
    // A leftover edge on a laid floor stays inside one stretch of ground, so it can neither join two regions
    // the lock keeps apart nor go round a door.
    if (state.lay && ground.get(hereKey) !== ground.get(thereKey)) return false
    const gateClear = (!gated.has(hereKey) && !gated.has(thereKey)) || crossesNoDoor(behind(hereKey), behind(thereKey))
    if (!gateClear) return false
    // STRUCTURAL check, asked whether or not the topology mod gates anything here — so a stray edge that would
    // bridge two regions gets refused the identical way whether or not an obstacle happens to stand at their
    // one real seam.
    return (
      (!seamGated.has(hereKey) && !seamGated.has(thereKey)) || crossesNoDoor(behindSeam(hereKey), behindSeam(thereKey))
    )
  }
}

/** Every way out of one node — the passages it actually has, to the node two cells away. */
export const nodeExitsOf = (state: DoorView, switchDoors?: SwitchDoors) => {
  const N = state.maze.n
  const allowed = edgeAllowed(state, switchDoors)
  return (cellKey: string): { dir: Direction; neighborKey: string }[] => {
    const [r, c] = cellKey.split(",").map(Number)
    const out: { dir: Direction; neighborKey: string }[] = []
    for (const [dr, dc, d] of CONNECTOR_DIRS) {
      const nr = r + dr,
        nc = c + dc
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
      if (!state.branches.used.has(`${nr},${nc}`) || !allowed(r, c, nr, nc)) continue
      out.push({ dir: d, neighborKey: `${nr},${nc}` })
    }
    return out
  }
}

/**
 * Every room the passes decided, in the order they were first written: a chain's room wins where a chain hangs
 * off a junction of the main path.
 */
export const rooms = (state: Pick<Required<CarveState>, "mainRooms" | "chainRooms">): ReadonlyMap<string, RoomSpec> =>
  new Map([...state.mainRooms, ...state.chainRooms])

/**
 * WHICH WAYS OUT A JUNCTION HAS FREE. Of the main path, only the way ONWARD: closing the way back would shut the
 * player in with the junction. And of the rest, only the ways out that nothing already stands beyond — which is
 * one rule and covers the two the floor cannot have. A ward's own door already claims that boundary, and a
 * second door on one boundary is two doors in one doorway; a junction beyond a way out is one open space, and a
 * gate would draw a wall through the middle of it. Both of those are rooms by the time this is asked, and so is
 * a side path's own gate and any room the carve hung right beside the junction. What is left — the main path
 * onward and the side paths off this junction — is what may be closed.
 *
 * Nor a way out into a HIDDEN section: a gate the player can see is a statement that something is there, and a
 * hidden section is the statement that nothing is until they find otherwise. Refused here, so the spoiler never
 * exists rather than being swept up afterwards.
 */
export const freeWaysOut = (
  state: DoorView & Pick<Required<CarveState>, "labels" | "mainRooms" | "chainRooms">,
  switchDoors?: SwitchDoors
) => {
  const stepOf = routeStepOf(state.maze)
  const exitsOf = nodeExitsOf(state, switchDoors)
  const roomAt = rooms(state)
  return (pk: string) => {
    const onward = (stepOf.get(pk) ?? -1) + 1
    return exitsOf(pk).filter(({ neighborKey }) => {
      const neighborMi = stepOf.get(neighborKey)
      if (neighborMi !== undefined && neighborMi !== onward) return false
      if (state.labels.hidden.has(neighborKey)) return false
      return !roomAt.has(neighborKey)
    })
  }
}
