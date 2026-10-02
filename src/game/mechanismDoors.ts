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
 * by marking the door passed.
 *
 * **Here, and before the save is applied.** Reachability spreads out of the cells a save calls explored
 * (`completeCell`), so a way out reopened after that pass would be open with the dark still behind it
 * until something else made the floor reveal again. Ahead of it, the floor reads exactly as one whose
 * switch had never shut that way.
 *
 * Only a door with nothing standing in it is ever touched: a gate a family renders is opened by what
 * the player does in it, and that is not this.
 */
export const openWaysOut = (grid: FloorGrid, open: ReadonlySet<string>): FloorGrid => {
  if (open.size === 0) return grid
  let opened = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room" || cell.family !== undefined) return cell
      if (!cell.tags?.includes("gate") || !cell.requiredKeyId || !open.has(cell.requiredKeyId)) return cell
      opened = true
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
      }
    })
  )
  return opened ? { ...grid, cells } : grid
}
