import type { FloorGrid, GridCell, MechanismRecord } from "./siteTypes"
import { cellAddress } from "./cellAddress"
import { doorOpen, type DoorMode } from "./doorOpen"

const NO_KEYS: ReadonlySet<string> = new Set()

// WHICH DOORS STAND OPEN IS ASKED OF EACH MECHANISM'S OWN MAPPING, NEVER STORED. The save holds the
// position; the floor holds what that position opens. Keeping the mapping here rather than in the save
// is what lets a re-carve move a door without a stored entry coming to fit one it was never set for.
//
// A DOOR IS FOLDED FROM ITS OWNERS, NEVER UNIONED, BY `doorOpen` — the rule `openGates` (lockWalk.ts)
// folds the proof by. Its owners are every mechanism naming its gate key in any position, each asked
// whether its CURRENT state names it, and every floor key a door cell lists beside that gate key
// (`requiredKeyIds`), each asked whether it is held. An owner nothing on the floor can supply (a key no
// chest mints) is never held, so under `and` it keeps the door shut and under `any` it stands aside.
export const openDoorsFor = (
  grid: FloorGrid,
  floor: number,
  positions: ReadonlyMap<string, string>,
  heldKeys: ReadonlySet<string> = NO_KEYS
): Set<string> => {
  const owners = new Map<string, { says: boolean[]; mode: DoorMode; floorKeys: Set<string> }>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism) continue
      const at = cellAddress(grid, floor, r, c)
      if (!at) continue
      // NO STORED ENTRY MEANS THE MECHANISM'S OWN INITIAL POSITION, never "nothing open": a lever
      // stands on one of its two sides from the moment the floor is carved, and the gates that side
      // names stand open before anybody touches it.
      const state = positions.get(at) ?? cell.mechanism.initial
      // A position this build no longer has simply opens nothing — the only safe answer: guessing at
      // the nearest position would open a door nobody threw the lever for.
      const { positions: named } = cell.mechanism
      for (const gateKeyId of new Set(named.map(p => p.gateKeyId))) {
        const gate = owners.get(gateKeyId) ?? { says: [], mode: "all", floorKeys: new Set() }
        gate.says.push(named.some(p => p.gateKeyId === gateKeyId && p.state === state))
        if (named.some(p => p.gateKeyId === gateKeyId && p.mode === "any")) gate.mode = "any"
        owners.set(gateKeyId, gate)
      }
    }
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.requiredKeyId || !cell.requiredKeyIds?.length) continue
      // A gate key no mechanism names is an owner that never says yes, as `floorLock` seals it.
      const gate = owners.get(cell.requiredKeyId) ?? {
        says: [false],
        mode: "all" as const,
        floorKeys: new Set<string>(),
      }
      owners.set(cell.requiredKeyId, gate)
      // A set, so the several doors of one region barrier count a key once.
      for (const keyId of cell.requiredKeyIds) gate.floorKeys.add(keyId)
    }
  const open = new Set<string>()
  for (const [gateKeyId, { says, mode, floorKeys }] of owners)
    if (doorOpen([...says, ...[...floorKeys].map(keyId => heldKeys.has(keyId))], mode)) open.add(gateKeyId)
  return open
}

/** A mechanism as one cell sees it: where its record and its one stored state live (`home`), and which
 * of its placed transitions this cell works, when it is not the home itself. */
export type WorkedMechanism = { home: [number, number]; record: MechanismRecord; transition?: number }

/**
 * WHICH MECHANISM A CELL WORKS, and which transition of it. A room carrying a record works its own,
 * every move; a room pointing at one (`worksMechanism`) works the move the record places at it. Nothing
 * when the cell works none, or points at a home this floor does not have.
 */
export const mechanismWorkedAt = (grid: FloorGrid, row: number, col: number): WorkedMechanism | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room") return undefined
  // A home that also works a move of its own (a sequence's first tile) says which one.
  if (cell.mechanism)
    return {
      home: [row, col],
      record: cell.mechanism,
      ...(cell.worksMechanism ? { transition: cell.worksMechanism.transition } : {}),
    }
  if (!cell.worksMechanism) return undefined
  const { mechanismId, transition } = cell.worksMechanism
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const home = grid.cells[r][c]
      if (home.type === "room" && home.mechanism && home.mechanismId === mechanismId)
        return { home: [r, c], record: home.mechanism, transition }
    }
  return undefined
}

/** THE ONE KEY A MECHANISM'S STATE IS FILED UNDER, whichever of its cells is asking: the home room's
 * address, so a remote cell reads and writes the entry its home does and no key of its own. */
export const mechanismAddress = (grid: FloorGrid, floor: number, row: number, col: number): string | null => {
  const worked = mechanismWorkedAt(grid, row, col)
  return worked ? cellAddress(grid, floor, worked.home[0], worked.home[1]) : null
}

type MechanismShape = Pick<MechanismRecord, "states" | "initial" | "returnsToInitial" | "transitions" | "placedOnly">

/**
 * THE ONE RULE FOR WHERE A PRESS CAN SEND A MECHANISM, shared by the solver (`floorLock`'s transitions)
 * and play (`throwMechanism`) so the two cannot disagree about what is reachable: every declared state
 * but the one it stands in, and never `initial` when the record says it does not return there. Declared
 * order, so a press has a stable "next". Empty for a spent one-way mechanism.
 */
export const legalTargets = (
  { states, initial, returnsToInitial, transitions, placedOnly }: MechanismShape,
  from: string
): string[] => {
  // A mechanism that places every move has only the moves it places, out of the state it is in.
  const placed = new Set((transitions ?? []).filter(t => t.from === undefined || t.from === from).map(({ to }) => to))
  return states.filter(to => to !== from && (returnsToInitial || to !== initial) && (!placedOnly || placed.has(to)))
}

/**
 * A SPENT MECHANISM: one with nowhere left to go, so a press would do nothing. Of the contract's kinds
 * that is the activator once used (a lit torch, a thrown one-way switch) and nothing else: a mechanism
 * that returns to its start, or a one-way one with a position still ahead of it, can always be pressed.
 * Navigation reads it to offer nothing and the map to draw the used appearance, so the two agree.
 */
export const isSpent = (mechanism: MechanismShape, state: string): boolean =>
  legalTargets(mechanism, state).length === 0

/**
 * WHAT A PRESS AT ONE CELL WRITES: the mechanism's one key and the state it goes to. A cell working its
 * own mechanism sends it to the next of `throwMechanism`; a remote cell works only the moves the record
 * places there, and a press out of a state none of them leaves from writes the state it is in.
 * Nothing when the cell works no mechanism.
 */
export const pressAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>
): { address: string; state: string } | undefined => {
  const worked = mechanismWorkedAt(grid, row, col)
  const address = mechanismAddress(grid, floor, row, col)
  if (!worked || !address) return undefined
  const { record, transition } = worked
  const current = states.get(address) ?? record.initial
  if (transition === undefined) return { address, state: throwMechanism(record, current) }
  // Every move the record places at this cell is this cell's to make, so one tile can advance a run,
  // spoil it or do nothing according to where the run stands.
  const legal = legalTargets(record, current)
  const move = (record.transitions ?? []).find(
    t => t.at[0] === row && t.at[1] === col && (t.from === undefined || t.from === current) && legal.includes(t.to)
  )
  return { address, state: move ? move.to : current }
}

/**
 * WHERE ONE PRESS SENDS IT: the next of `legalTargets` after the current state in declared order,
 * wrapping round. A two-state returning mechanism toggles; a mechanism with no legal target (a torch
 * once lit) stays where it is. A state the record does not have (a stale save) takes the first target.
 */
export const throwMechanism = (mechanism: MechanismRecord, current: string): string => {
  const targets = legalTargets(mechanism, current)
  if (targets.length === 0) return current
  const at = mechanism.states.indexOf(current)
  return targets.find(to => mechanism.states.indexOf(to) > at) ?? targets[0]
}

/**
 * The ways out a switch's board leaves open, put back the way the carve had them.
 *
 * A switch shuts every way out of its fork by overwriting the corridor node beyond it with a door, and
 * the board standing in the fork reopens the one it routes its beam to. That door is the ONLY thing in
 * the way: a node with something in it stops the walk from revealing past it, so the way out is opened
 * by giving the cell back its corridor — the same cell, the same walls, the same section — rather than
 * by marking the door passed. The corridor keeps what it was a door of (`openGate`), which is only
 * ever read to draw it: every walk, reveal and count sees the corridor it has always seen. A region
 * barrier's door keeps nothing: open, it is plain ground.
 *
 * **Here, and before the save is applied.** Reachability spreads out of the cells a save calls explored
 * (`completeCell`), so a way out reopened after that pass would be open with the dark still behind it
 * until something else made the floor reveal again. Ahead of it, the floor reads exactly as one whose
 * switch had never shut that way.
 *
 * Only a door with nothing standing in it is ever touched: a gate a family renders is opened by what
 * the player does in it, and that is not this. The exception is a door wearing its face (`gateFace`),
 * which reads and never opens, so its condition being met is the only thing that can.
 */
export const openWaysOut = (grid: FloorGrid, open: ReadonlySet<string>): FloorGrid => {
  if (open.size === 0) return grid
  let opened = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room" || (cell.family !== undefined && cell.gateFace === undefined)) return cell
      if (!cell.tags?.includes("gate") || !cell.requiredKeyId || !open.has(cell.requiredKeyId)) return cell
      opened = true
      // Open, a region barrier's blockage is gone and its cell is ground: nothing is left to draw.
      const remembered = cell.regionBarrier === undefined
      return {
        type: "corridor",
        dirs: cell.dirs,
        state: cell.state,
        sectionAddress: cell.sectionAddress,
        sectionHash: cell.sectionHash,
        legacySectionHash: cell.legacySectionHash,
        ordinal: cell.ordinal,
        difficulty: cell.difficulty,
        hidden: cell.hidden,
        ...(remembered && {
          openGate: {
            tags: cell.tags,
            requiredKeyId: cell.requiredKeyId,
            gateVariant: cell.gateVariant,
            keyIsAuthored: cell.keyIsAuthored,
            keyColor: cell.keyColor,
            keyColors: cell.keyColors,
            mark: cell.mark,
          },
        }),
      }
    })
  )
  return opened ? { ...grid, cells } : grid
}
