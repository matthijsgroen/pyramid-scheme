import { cellAddress } from "./cellAddress"
import type { FloorGrid, GridCell, KeyColor, MechanismRecord, RoomCell } from "./siteTypes"

/** The family that stands in a gate which has to explain itself. It reads and never opens: the door
 * opens by its condition being met (`openWaysOut`), never by anything done in front of it. */
export const GATE_FACE_FAMILY = "gate-face"

/** What an owner looks like on the face: a mechanism wears its own family's icon (a flame for a torch),
 * a floor key wears a key in its colour. */
export type GateOwnerIcon = { kind: "mechanism"; family: string } | { kind: "key"; color?: KeyColor }

/** One owner of the door, unlit until its current state names the door. */
export type GateMarker = { id: string; icon: GateOwnerIcon; lit: boolean }

/** WHAT A DOOR WAITS FOR, one marker per owner, in a list so a door that waits on an ORDER can carry its
 * markers in that order. Derived from the owners; nobody authors it. */
export type GateFace = { markers: readonly GateMarker[] }

type Owner = { id: string; family: string; mechanism: MechanismRecord; at: readonly [number, number] }

const ownersOf = (grid: FloorGrid, gateKeyId: string): Owner[] => {
  const owners: Owner[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism || cell.family === undefined) continue
      if (!cell.mechanism.positions.some(p => p.gateKeyId === gateKeyId)) continue
      owners.push({ id: cell.mechanismId ?? `${r},${c}`, family: cell.family, mechanism: cell.mechanism, at: [r, c] })
    }
  // By id, so the markers keep their order when a re-carve moves the owners about the floor.
  return owners.sort((a, b) => a.id.localeCompare(b.id))
}

// A face is owed only where operating an owner can change nothing visible: an `and` door with more than
// one owner. A single owner teaches by consequence, and an `any` door opens on the first owner touched.
const needsFace = (owners: readonly Owner[], gateKeyId: string): boolean =>
  owners.length > 1 && !owners.some(o => o.mechanism.positions.some(p => p.gateKeyId === gateKeyId && p.mode === "any"))

const isGateDoor = (cell: GridCell): cell is RoomCell & { requiredKeyId: string } =>
  cell.type === "room" && cell.requiredKeyId !== undefined && (cell.tags?.includes("gate") ?? false)

/**
 * Gives every door that needs one its face, lit by where each owner stands in `positions` (keyed by the
 * owner's cell address; an owner with no entry stands in its initial state).
 *
 * Only `family` and `gateFace` are written, never `dirs` or any other cell: the door was already there.
 * Idempotent, so the runtime calls it again with the live positions to relight a face the assembler
 * wrote from the initial ones.
 */
export const withGateFaces = (grid: FloorGrid, floor: number, positions: ReadonlyMap<string, string>): FloorGrid => {
  let changed = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (!isGateDoor(cell)) return cell
      const key = cell.requiredKeyId
      const owners = ownersOf(grid, key)
      if (!needsFace(owners, key)) return cell
      const markers = owners.map(({ id, family, mechanism, at }): GateMarker => {
        const address = cellAddress(grid, floor, at[0], at[1])
        const state = (address ? positions.get(address) : undefined) ?? mechanism.initial
        return {
          id,
          icon: { kind: "mechanism", family },
          lit: mechanism.positions.some(p => p.gateKeyId === key && p.state === state),
        }
      })
      changed = true
      return { ...cell, family: GATE_FACE_FAMILY, gateFace: { markers } }
    })
  )
  return changed ? { ...grid, cells } : grid
}
