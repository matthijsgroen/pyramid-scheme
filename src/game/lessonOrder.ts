import { doorOpen, type DoorMode } from "./doorOpen"
import { findPath, walkableFrom } from "./gridNavigation"
import { inRect, prefabRoomAt, prefabRoomCells } from "./roomShape"
import type { Direction, FloorGrid, GridCell, MechanismRecord, RoomCell } from "./siteTypes"

// A LESSON SHOWS ITS PROBLEM BEFORE ITS ANSWER (docs/game-design/lock-curriculum.md): the shut door is met before
// the control that opens it, and the control stands off the way to that door. The lock walk only asks whether the
// floor can be finished; this asks it of the carve as the player walks it, grown rooms included.

type Pos = readonly [number, number]
const MOVES: Record<Direction, Pos> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const at = (r: number, c: number) => `${r},${c}`

type Home = { pos: Pos; cell: RoomCell; mechanism: MechanismRecord }

const isDoor = (cell: GridCell): cell is RoomCell & { requiredKeyId: string } =>
  cell.type === "room" && cell.requiredKeyId !== undefined && (cell.tags?.includes("gate") ?? false)

/** Every cell a mechanism is moved on from where it starts: its own room, and each place a move out of its initial
 * state is made. A place that only puts it back (a sequence's reset at its door) is no control. */
const controlCellsOf = ({ pos, mechanism }: Home): string[] => [
  at(...pos),
  ...(mechanism.transitions ?? []).filter(({ to }) => to !== mechanism.initial).map(t => at(t.at[0], t.at[1])),
]

/** The floor as the player walks it: `blocked` and hidden ground turned to stone, the rest in plain sight, and every
 * door left standing, `ground` among them, plain corridor (`blocked` holds every shut one). */
const walkGrid = (grid: FloorGrid, blocked: (cell: GridCell, key: string) => boolean, ground?: string): FloorGrid => ({
  ...grid,
  cells: grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (cell.type === "empty") return cell
      const open: GridCell = { type: "corridor", dirs: cell.dirs, state: "visible" }
      if (at(r, c) === ground) return open
      if (cell.hidden || blocked(cell, at(r, c))) return { type: "empty" }
      if (isDoor(cell)) return open
      return { ...cell, state: "visible" }
    })
  ),
})

/** The faults of `grid` against the lesson rules, one per gate and rule broken; none on a floor that keeps them. A
 * gate counts when it is shut at the start and owned by a control on this floor; a board standing in the gate's own
 * junction (its `exits` name the gate) is no such control. */
export const lessonOrderFaults = (grid: FloorGrid): string[] => {
  const homes: Home[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "room" && cell.mechanism) homes.push({ pos: [r, c], cell, mechanism: cell.mechanism })
    })
  )
  const owners = new Map<string, { says: boolean[]; mode: DoorMode; controls: Home[] }>()
  for (const home of homes) {
    const { positions, initial } = home.mechanism
    for (const gateKeyId of new Set(positions.map(p => p.gateKeyId))) {
      const gate = owners.get(gateKeyId) ?? { says: [], mode: "all", controls: [] }
      gate.says.push(positions.some(p => p.gateKeyId === gateKeyId && p.state === initial))
      if (positions.some(p => p.gateKeyId === gateKeyId && p.mode === "any")) gate.mode = "any"
      if (!home.cell.exits?.some(exit => exit.gateKeyId === gateKeyId)) gate.controls.push(home)
      owners.set(gateKeyId, gate)
    }
  }
  const doors = new Map<string, Pos[]>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (isDoor(cell)) doors.set(cell.requiredKeyId, [...(doors.get(cell.requiredKeyId) ?? []), [r, c]])
    })
  )
  const shutAtStart = (cell: GridCell): boolean => {
    if (!isDoor(cell)) return false
    const gate = owners.get(cell.requiredKeyId)
    const floorKeys = (cell.requiredKeyIds ?? []).map(() => false)
    return !doorOpen([...(gate?.says ?? []), ...floorKeys], gate?.mode)
  }

  const faults: string[] = []
  for (const [gateKeyId, { controls }] of owners) {
    const gateDoors = doors.get(gateKeyId) ?? []
    if (controls.length === 0 || gateDoors.length === 0) continue
    if (!shutAtStart(grid.cells[gateDoors[0][0]][gateDoors[0][1]])) continue
    const controlCells = new Set(controls.flatMap(controlCellsOf))

    const walked = walkableFrom(
      walkGrid(grid, (cell, key) => shutAtStart(cell) || controlCells.has(key)),
      grid.entrancePos
    )
    const seen = gateDoors.some(([r, c]) =>
      [...(grid.cells[r][c] as RoomCell).dirs].some(dir => walked.has(at(r + MOVES[dir][0], c + MOVES[dir][1])))
    )
    if (!seen) faults.push(`gate ${gateKeyId}: its door is not seen before its control`)

    const paths = gateDoors
      .map(door => findPath(walkGrid(grid, shutAtStart, at(...door)), grid.entrancePos, door))
      .filter(path => path.length > 0)
      .sort((a, b) => a.length - b.length)
    const way = paths[0]
    if (!way) continue
    if (way.some(([r, c]) => controlCells.has(at(r, c))))
      faults.push(`gate ${gateKeyId}: its control stands on the way to its door`)
    const prefabs = prefabRoomCells(grid)
    const rooms = new Set(way.flatMap(([r, c]) => prefabs.get(at(r, c)) ?? []))
    for (const node of rooms) {
      const [r, c] = node.split(",").map(Number)
      const { top, left, rows, cols } = prefabRoomAt(grid, r, c)!.rect
      const ring = { top: top - 1, left: left - 1, rows: rows + 2, cols: cols + 2 }
      if ([...controlCells].some(key => inRect(ring, ...(key.split(",").map(Number) as [number, number]))))
        faults.push(
          `gate ${gateKeyId}: its control stands in the ring of the prefab room at ${node} on the way to its door`
        )
    }
  }
  return faults
}
