import { cellAddress } from "./cellAddress"
import { pressAt } from "./mechanismDoors"
import { tileStatus, type TileStatus } from "./sequence"
import type { FloorGrid, GridCell, KeyColor, MechanismRecord, RoomCell } from "./siteTypes"

/** The family that stands in a gate which has to explain itself. It reads and never opens: the door
 * opens by its condition being met (`openWaysOut`), never by anything done in front of it. */
export const GATE_FACE_FAMILY = "gate-face"

/** What an owner looks like on the face: a mechanism wears its own family's icon (a flame for a torch),
 * a floor key wears a key in its colour. */
export type GateOwnerIcon = { kind: "mechanism"; family: string } | { kind: "key"; color?: KeyColor }

/** One owner of the door, unlit until its current state names the door. */
export type GateMarker = { id: string; icon: GateOwnerIcon; lit: boolean }

/** One tile of a sequence as the door lists it: the glyph it wears and how the run stands on it. */
export type SequenceFaceTile = { glyph: number; status: TileStatus }

/** The order a door waits on, tiles in step order, and the reset the door carries: the write that sends
 * the run back to its start, absent while there is nothing to start again. */
export type SequenceFace = {
  id: string
  tiles: readonly SequenceFaceTile[]
  reset?: { address: string; state: string }
}

/** WHAT A DOOR WAITS FOR, one marker per owner, plus the order of each sequence it waits on. Derived from
 * the owners; nobody authors it. */
export type GateFace = { markers: readonly GateMarker[]; sequences?: readonly SequenceFace[] }

const NO_KEYS: ReadonlySet<string> = new Set()

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
// A door a sequence opens or resets at is owed one besides: nothing else says what order it waits on.
const needsFace = (owners: readonly Owner[], keyCount: number, gateKeyId: string): boolean =>
  owners.length + keyCount > 1 &&
  !owners.some(o => o.mechanism.positions.some(p => p.gateKeyId === gateKeyId && p.mode === "any"))

type SequenceHome = { id: string; mechanism: MechanismRecord; at: readonly [number, number] }

const sequencesOf = (grid: FloorGrid): SequenceHome[] => {
  const homes: SequenceHome[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.mechanism && cell.sequenceTile?.step === 0)
        homes.push({ id: cell.sequenceTile.id, mechanism: cell.mechanism, at: [r, c] })
    }
  return homes.sort((a, b) => a.id.localeCompare(b.id))
}

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
export const withGateFaces = (
  grid: FloorGrid,
  floor: number,
  positions: ReadonlyMap<string, string>,
  heldKeys: ReadonlySet<string> = NO_KEYS
): FloorGrid => {
  let changed = false
  const homes = sequencesOf(grid)
  const cells = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (!isGateDoor(cell)) return cell
      const key = cell.requiredKeyId
      const owners = ownersOf(grid, key)
      // A sequence is on a door it opens, and on the door it is reset at.
      const sequences = homes.filter(
        ({ id, mechanism }) =>
          mechanism.positions.some(p => p.gateKeyId === key) || cell.worksMechanism?.mechanismId === id
      )
      // A floor key the door lists beside its gate key owns it too, lit while the key is held.
      const floorKeys = cell.requiredKeyIds ?? []
      if (!needsFace(owners, floorKeys.length, key) && sequences.length === 0) return cell
      const markers = owners.map(({ id, family, mechanism, at }): GateMarker => {
        const address = cellAddress(grid, floor, at[0], at[1])
        const state = (address ? positions.get(address) : undefined) ?? mechanism.initial
        return {
          id,
          icon: { kind: "mechanism", family },
          lit: mechanism.positions.some(p => p.gateKeyId === key && p.state === state),
        }
      })
      for (const keyId of floorKeys) markers.push({ id: keyId, icon: { kind: "key" }, lit: heldKeys.has(keyId) })
      const orders = sequences.map(({ id, mechanism, at }): SequenceFace => {
        const address = cellAddress(grid, floor, at[0], at[1])
        const state = (address ? positions.get(address) : undefined) ?? mechanism.initial
        const tiles = grid.cells
          .flat()
          .flatMap(tile => (tile.type === "room" && tile.sequenceTile?.id === id ? [tile.sequenceTile] : []))
          .sort((a, b) => a.step - b.step)
          .map(({ step, glyph }): SequenceFaceTile => ({ glyph, status: tileStatus(state, step) }))
        const press = cell.worksMechanism?.mechanismId === id ? pressAt(grid, floor, r, c, positions) : undefined
        return { id, tiles, ...(press && press.state !== state ? { reset: press } : {}) }
      })
      changed = true
      return {
        ...cell,
        family: GATE_FACE_FAMILY,
        gateFace: { markers, ...(orders.length > 0 ? { sequences: orders } : {}) },
      }
    })
  )
  return changed ? { ...grid, cells } : grid
}
