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
// the whole door. On a door naming a mechanism's key and a key nothing on the floor opens, "any" would
// make the walk and this fold each call it open, agreeing and both wrong. Obstacle keys are namespaced
// `obstacle:`, so no authoring today builds that door; whoever authors the first multi-key one must
// reconcile the two folds before trusting either.
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

/**
 * WHERE ONE PRESS SENDS IT: the other of the mechanism's own last two declared positions.
 *
 * A genuine handle (`FloorConfig.handles`) declares exactly two — `left`/`right` — and both are always
 * a press's legal target. A control (`FloorConfig.controls`) may lead with one more: its `initial`,
 * named only so `openDoorsFor` has something to fall back to before anyone touches it (doubleBack's Y
 * starts `"unset"`, reachable from nowhere once the first throw has moved it on) — never itself a
 * target, so the last two states are always the pair a press toggles between, whatever an author named
 * them. A two-state mechanism's last two ARE its only two, so the same rule covers both shapes without
 * asking which one this is.
 */
export const throwMechanism = (mechanism: MechanismRecord, current: string): string => {
  const [a, b] = mechanism.states.slice(-2)
  return current === a ? b : a
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
