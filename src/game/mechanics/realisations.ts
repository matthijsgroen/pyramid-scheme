import { DEFAULT_CONTROL_ROLE, DOOR_FACE_ROLE } from "../encounterFallback"
import { isSequence, type Control } from "../obstacles"
import { oneWayRuns } from "../gridNavigation"
import type { ResolveEncounter } from "../siteAssembler"
import type { CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "../siteTypes"

// CORE OWNS EVERY CONTROL KIND AND A MOD ONLY DRESSES ONE. A mechanism whose realisation no registered mod
// provides is not a mistake in the floor: it is carved exactly as if it were there, and what a mod's absence
// leaves behind is the carve without its mechanics. A role the author never bound is a mistake, and is
// refused where it is bound (lockCompile's `unboundRole`, the one-way's `unbound`), never degraded here.

const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const answered = (resolve: ResolveEncounter, encounter: string | undefined, role: string): boolean =>
  resolve(encounter, role).ownerMod !== undefined

/**
 * THE SEQUENCES WHOSE REALISATION THE BUILD CANNOT ANSWER, by id. A sequence a lock placed names its
 * realisation; one authored longhand names none and is read at the door's face, so it is answered by whatever
 * answers to the door-face role.
 */
export const unrealisedSequences = (controls: readonly Control[], resolve: ResolveEncounter): ReadonlySet<string> =>
  new Set(
    controls
      .filter(isSequence)
      .filter(control =>
        control.encounter === undefined
          ? !answered(resolve, undefined, DOOR_FACE_ROLE)
          : !answered(resolve, control.encounter, DEFAULT_CONTROL_ROLE)
      )
      .map(control => control.id)
  )

/** What a corridor keeps of the room it was: its place in the carve and nothing the room held. */
const groundOf = (cell: RoomCell): CorridorCell => ({
  type: "corridor",
  dirs: cell.dirs,
  state: cell.state,
  ...(cell.difficulty !== undefined ? { difficulty: cell.difficulty } : {}),
  ...(cell.sectionAddress !== undefined ? { sectionAddress: cell.sectionAddress } : {}),
  ...(cell.region !== undefined ? { region: cell.region } : {}),
  ...(cell.sectionHash !== undefined ? { sectionHash: cell.sectionHash } : {}),
  ...(cell.legacySectionHash !== undefined ? { legacySectionHash: cell.legacySectionHash } : {}),
  ...(cell.ordinal !== undefined ? { ordinal: cell.ordinal } : {}),
  ...(cell.hidden !== undefined ? { hidden: cell.hidden } : {}),
})

/** The ways out of a room, less the gate keys that no longer stand. */
const exitsWithout = (cell: RoomCell, dropped: ReadonlySet<string>): Pick<RoomCell, "exits"> => ({
  exits: cell.exits?.map(({ gateKeyId, mark, ...exit }) =>
    gateKeyId !== undefined && dropped.has(gateKeyId)
      ? exit
      : { ...exit, ...(gateKeyId !== undefined ? { gateKeyId } : {}), ...(mark ? { mark } : {}) }
  ),
})

/** A junction keeps its place and its ways out and loses what stood in it. */
const bareJunction = (cell: RoomCell, dropped: ReadonlySet<string>): RoomCell => {
  const {
    family: _family,
    tags: _tags,
    mechanism: _mechanism,
    mechanismId: _mechanismId,
    boardIndex: _boardIndex,
    encounterArgs: _encounterArgs,
    worksMechanism: _worksMechanism,
    mark: _mark,
    ...rest
  } = cell
  return { ...rest, ...(cell.exits ? exitsWithout(cell, dropped) : {}) }
}

type Unrealised = { sequences: ReadonlySet<string>; oneWays: boolean; regionBarriers?: boolean }

/**
 * TAKES THE MECHANICS NO REGISTERED MOD REALISES OFF A FINISHED CARVE, leaving every wall where it was:
 * - a mechanism room is a bare node (a junction stays a junction, empty), and a sequence's tiles are ground;
 * - a door that only such mechanisms owned stands open as plain ground, a region barrier's included;
 * - a door another owner still has (a mechanism that is realised, or a floor key) keeps standing;
 * - a one-way whose realisation is missing is an ordinary two-way passage;
 * - a region barrier whose realisation is missing is plain ground at its door.
 * Cells are read for what they hold, never re-derived, so the mod on and off share one carve.
 */
export const degradeUnrealised = (
  grid: FloorGrid,
  resolve: ResolveEncounter,
  { sequences, oneWays, regionBarriers = false }: Unrealised
): FloorGrid => {
  const isBare = (cell: RoomCell): boolean =>
    cell.sequenceTile !== undefined
      ? sequences.has(cell.sequenceTile.id)
      : cell.mechanism !== undefined && cell.family !== undefined && !answered(resolve, cell.family, cell.family)

  const droppedKeys = new Set<string>()
  const liveKeys = new Set<string>()
  const droppedIds = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row) {
      if (cell.type !== "room") continue
      const bare = isBare(cell)
      if (bare && cell.mechanismId !== undefined) droppedIds.add(cell.mechanismId)
      for (const { gateKeyId } of cell.mechanism?.positions ?? []) (bare ? droppedKeys : liveKeys).add(gateKeyId)
    }
  if (droppedKeys.size === 0 && droppedIds.size === 0 && sequences.size === 0 && !oneWays && !regionBarriers)
    return grid

  const standsOpen = (cell: RoomCell): boolean =>
    (cell.tags?.includes("gate") ?? false) &&
    cell.requiredKeyId !== undefined &&
    droppedKeys.has(cell.requiredKeyId) &&
    !liveKeys.has(cell.requiredKeyId) &&
    !cell.requiredKeyIds?.length

  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room") return cell
      if (isBare(cell)) return cell.roomType === "fork" ? bareJunction(cell, droppedKeys) : groundOf(cell)
      if (standsOpen(cell) || (regionBarriers && cell.regionBarrier !== undefined)) return groundOf(cell)
      const { worksMechanism, ...rest } = cell
      const works =
        worksMechanism !== undefined &&
        (sequences.has(worksMechanism.mechanismId) || droppedIds.has(worksMechanism.mechanismId))
      const exits = cell.exits?.some(({ gateKeyId }) => gateKeyId !== undefined && droppedKeys.has(gateKeyId)) ?? false
      return works || exits ? { ...(works ? rest : cell), ...(exits ? exitsWithout(cell, droppedKeys) : {}) } : cell
    })
  )

  if (oneWays) joinDrops(cells, grid)
  return { ...grid, cells }
}

// A DROP WITHOUT ITS REALISATION IS A PASSAGE: the launch, every cell of the span and the landing name the way
// along it and the way back, so it is walked like any other corridor and nothing is left to take it through.
const joinDrops = (cells: GridCell[][], grid: FloorGrid): void => {
  for (const { launch, cells: span, landing, dir } of oneWayRuns({ ...grid, cells })) {
    const join = ([r, c]: readonly [number, number], dirs: readonly Direction[]) => {
      const cell = cells[r][c]
      if (cell.type !== "corridor") return
      const { obstacle: _obstacle, ...rest } = cell
      cells[r][c] = { ...rest, dirs: new Set([...cell.dirs, ...dirs]) }
    }
    join(launch, [dir])
    for (const at of span) join(at, [dir, OPPOSITE[dir]])
    join(landing, [OPPOSITE[dir]])
  }
}
