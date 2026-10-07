import { storedAtCell } from "./cellAddress"
import { mechanismAddress, mechanismWorkedAt, openDoorsFor, pressAt } from "./mechanismDoors"
import { arrangementOf } from "./mechanics/weights"
import type { FloorGrid, MechanismRecord, RoomCell } from "./siteTypes"

// THE STONES AS PLAY ASKS ABOUT THEM, read off the weights record a lock's first plate carries and never off a
// second copy of the rules: a move is what `pressAt` makes at the plate, an arrangement is what its key says.

/** THE READING OF A STORED ARRANGEMENT PLAY'S STONE QUESTIONS USE: the key itself where the record has it,
 * otherwise the authored start. A save from a build whose lock changed plays on from the start: saves are
 * migrated, never reset, and a puzzle frozen in a key with no move out of it is worse. Doors are not read through
 * it: `openDoorsFor` asks the record's positions, which open nothing on a key the record lacks. */
export const arrangementIn = (record: MechanismRecord, stored: string | undefined): string =>
  stored !== undefined && record.states.includes(stored) ? stored : record.initial

/** The arrangement the stones of a plate stand in, and the address it is filed under; nothing off a plate. A save
 * with no entry, or with a key the record does not have, stands in the authored start. */
export const stonesAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>
): { address: string; state: string } | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room" || !cell.plate) return undefined
  const worked = mechanismWorkedAt(grid, row, col)
  const address = mechanismAddress(grid, floor, row, col)
  if (!worked || !address) return undefined
  const [hr, hc] = worked.home
  return { address, state: arrangementIn(worked.record, storedAtCell(grid, floor, hr, hc, states)) }
}

/** What standing on a plate offers: the lift off it or the set-down on it, as the write it makes. Nothing where the
 * plate has no move out of the current arrangement: an empty plate with empty hands, or a full one while carrying.
 * `pressAt` is handed the arrangement `stonesAt` read, so a stale key presses as the start it is read as. */
export const stoneMoveAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>
): { address: string; state: string; move: "lift" | "set" } | undefined => {
  const stones = stonesAt(grid, floor, row, col, states)
  if (!stones) return undefined
  const press = pressAt(grid, floor, row, col, new Map(states).set(stones.address, stones.state))
  if (!press || press.state === stones.state) return undefined
  return { ...press, move: arrangementOf(press.state).hand ? "lift" : "set" }
}

/** Whether a stone is in hand on this floor: some lock's stones stand in an arrangement its record lists as
 * carrying. */
export const isCarrying = (grid: FloorGrid, floor: number, states: ReadonlyMap<string, string>): boolean => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism?.carrying?.length) continue
      if (cell.mechanism.carrying.includes(arrangementIn(cell.mechanism, storedAtCell(grid, floor, r, c, states))))
        return true
    }
  return false
}

/** A plate's three looks: raised (empty, nobody on it), pressed (somebody's weight on it, nothing else), and
 * pressed with a stone. A stone presses it whoever stands there. */
export type PlateLook = "raised" | "pressed" | "stone"

export const plateLookOf = (holdsStone: boolean, standing: boolean): PlateLook =>
  holdsStone ? "stone" : standing ? "pressed" : "raised"

/** How the plate at a cell looks now; nothing off a plate. `standing` is whether the explorer stands on it. */
export const plateLookAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>,
  standing: boolean
): PlateLook | undefined => {
  const stones = stonesAt(grid, floor, row, col, states)
  if (!stones) return undefined
  const { plate } = grid.cells[row][col] as RoomCell & { plate: { id: string } }
  return plateLookOf(arrangementOf(stones.state).weighted.includes(plate.id), standing)
}

/** What the explorer's weight moves while he stands on a plate: the gate keys it opens and the ones it shuts. */
export type ExplorerWeight = { plate: readonly [number, number]; open: ReadonlySet<string>; shut: ReadonlySet<string> }

// The two positions the weighed record is read in: the arrangement his weight makes, and one nothing stands in.
const WEIGHED = "weighed"
const NEVER = "never"

/**
 * WHAT HIS WEIGHT DOES, standing at `at`: nothing off a plate or on one that holds a stone already. Otherwise the
 * doors are folded twice by `openDoorsFor`, once as the stones stand and once as his weight makes them, and the
 * difference is what moves. Every gate the stones name stays theirs under his weight, said no to under `NEVER`
 * where the weighed arrangement does not open it, so a door they share with a lever is still theirs to refuse.
 */
export const explorerWeight = (
  grid: FloorGrid,
  floor: number,
  at: readonly [number, number],
  states: ReadonlyMap<string, string>,
  heldKeys?: ReadonlySet<string>
): ExplorerWeight | undefined => {
  const [row, col] = at
  const stones = stonesAt(grid, floor, row, col, states)
  const worked = mechanismWorkedAt(grid, row, col)
  if (!stones || !worked) return undefined
  const pressed = worked.record.underfoot?.find(u => u.from === stones.state && u.at[0] === row && u.at[1] === col)
  if (!pressed) return undefined
  const named = new Map(worked.record.positions.map(p => [p.gateKeyId, p.mode]))
  const record: MechanismRecord = {
    ...worked.record,
    positions: [
      ...pressed.opens.map(open => ({ state: WEIGHED, ...open })),
      ...[...named]
        .filter(([gateKeyId]) => !pressed.opens.some(open => open.gateKeyId === gateKeyId))
        .map(([gateKeyId, mode]) => ({ state: NEVER, gateKeyId, ...(mode ? { mode } : {}) })),
    ],
  }
  const [hr, hc] = worked.home
  const weighed: FloorGrid = {
    ...grid,
    cells: grid.cells.map((cells, r) =>
      r !== hr
        ? cells
        : cells.map((cell, c) => (c === hc && cell.type === "room" ? { ...cell, mechanism: record } : cell))
    ),
  }
  // Both folds read the arrangement `stonesAt` read, so a stale key is weighed as the start it is read as.
  const before = openDoorsFor(grid, floor, new Map(states).set(stones.address, stones.state), heldKeys)
  const after = openDoorsFor(weighed, floor, new Map(states).set(stones.address, WEIGHED), heldKeys)
  return {
    plate: at,
    open: new Set([...after].filter(key => !before.has(key))),
    shut: new Set([...before].filter(key => !after.has(key))),
  }
}
