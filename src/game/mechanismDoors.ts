import type { FloorGrid, GridCell, MechanismRecord } from "./siteTypes"
import { cellAddress } from "./cellAddress"

// WHICH DOORS STAND OPEN IS ASKED OF EACH MECHANISM'S OWN MAPPING, NEVER STORED. The save holds the
// position; the floor holds what that position opens. Keeping the mapping here rather than in the save
// is what lets a re-carve move a door without a stored entry coming to fit one it was never set for.
//
// A GATE IS FOLDED FROM ITS OWNERS, NEVER UNIONED. Every mechanism naming a gate key in any position owns
// it, and each is asked whether its CURRENT state names it; the answers are folded by the gate's mode,
// the same fold `openGates` (lockWalk.ts) applies, so what is proved is what is played for a door one
// key names.
//
// EQUIVALENCE IS NOT PROVED FOR A DOOR NAMING MORE THAN ONE KEY. This fold keys its owners by gate KEY
// id and sets "any" per key; `floorLock` keys them by BOUNDARY, adds a `sealed <keyId>` owner for every
// key the floor cannot open, and sets `anyGates` per boundary, so "any" authored for one key applies to
// the whole door. Obstacle keys are namespaced `obstacle:`, so no authoring today builds that door;
// whoever authors the first multi-key one must reconcile the two folds before trusting either.
//
// MEASURED, for a door owned by a mechanism and a FLOOR key, both ways round:
//   - No chest on the floor mints that key. `floorLock` gets owners [mechanism, `sealed <key>`] with
//     mode "any", so the door opens whenever the mechanism does. This fold never sees the key at all —
//     it reads only cells carrying `cell.mechanism` — and opens on the mechanism too. The two AGREE AND
//     ARE BOTH WRONG: a door stands open only while every key it names is satisfied.
//   - A chest does mint it. `floorLock` makes `key <id>` a real owner and folds mechanism OR held, which
//     is what "any" asks for. This fold still sees only the mechanism, so the two DISAGREE whenever the
//     key is held and the mechanism is at rest.
// Reconciling them means teaching this fold about floor keys, which it has no concept of, on the path
// that opens and shuts doors in live play. That is why it has not been done for a door nothing can
// author: the fix carries more risk today than the divergence does.
export const openDoorsFor = (grid: FloorGrid, floor: number, positions: ReadonlyMap<string, string>): Set<string> => {
  const owners = new Map<string, { says: boolean[]; any: boolean }>()
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
        const gate = owners.get(gateKeyId) ?? { says: [], any: false }
        gate.says.push(named.some(p => p.gateKeyId === gateKeyId && p.state === state))
        if (named.some(p => p.gateKeyId === gateKeyId && p.mode === "any")) gate.any = true
        owners.set(gateKeyId, gate)
      }
    }
  const open = new Set<string>()
  for (const [gateKeyId, { says, any }] of owners)
    if (any ? says.some(Boolean) : says.every(Boolean)) open.add(gateKeyId)
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
  if (cell.mechanism) return { home: [row, col], record: cell.mechanism }
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

type MechanismShape = Pick<MechanismRecord, "states" | "initial" | "returnsToInitial">

/**
 * THE ONE RULE FOR WHERE A PRESS CAN SEND A MECHANISM, shared by the solver (`floorLock`'s transitions)
 * and play (`throwMechanism`) so the two cannot disagree about what is reachable: every declared state
 * but the one it stands in, and never `initial` when the record says it does not return there. Declared
 * order, so a press has a stable "next". Empty for a spent one-way mechanism.
 */
export const legalTargets = ({ states, initial, returnsToInitial }: MechanismShape, from: string): string[] =>
  states.filter(to => to !== from && (returnsToInitial || to !== initial))

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
 * own mechanism sends it to the next of `throwMechanism`; a remote cell works only the move the record
 * places there, and a press out of a state that move does not leave from writes the state it is in.
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
  const placed = record.transitions?.[transition]
  const moves =
    !!placed &&
    (placed.from === undefined || placed.from === current) &&
    legalTargets(record, current).includes(placed.to)
  return { address, state: moves ? placed.to : current }
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
