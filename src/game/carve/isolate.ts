import { gateKeyOf } from "./ids"
import { keyOf } from "./derive"
import { makePkey } from "./grid"
import { roomJoins } from "./reserveRooms"
import { doorsShutting, MAIN_SECTION_ADDRESS } from "./sections"
import { pass } from "./state"
import type { Cell } from "./state"

/**
 * GATE ISOLATION: which maze edges a chain walked, and which doors must be earned to stand on each cell.
 *
 * `passages` spans the entire node lattice, so two used cells that happen to be tree-adjacent read as a real
 * door even though no chain walked that edge. Harmless for plain content; for gated content it is a bypass,
 * since a gate is a section's only legitimate entrance. Traps get the same treatment — a stray door steps
 * past the trap cell for free. `intended` holds the edges each chain actually walked; `gated` every cell
 * behind a gate or trap, sub-sections included. A door is allowed if it is intended, or if neither endpoint
 * is gated (`edgeAllowed`).
 *
 * `behind` says WHICH DOORS MUST BE EARNED TO STAND ON A CELL, not merely whether any must. A one-way drop may
 * run inside what a door shuts off, or out of it, but never into ground shut by a door the cell it falls from
 * does not already stand behind: being past one door earns nothing toward another. One notion covering every
 * door on the floor: the authored gates and traps, by the positional ids `s0`/`s0.1` addresses already use,
 * the gates bounding a region, and the doors a reserved junction's switch mints (`shutSwitchGround`).
 *
 * `seamBehind` is A SECOND, STRUCTURAL NOTION OF "BEHIND", from EVERY connection `regionLayout` declares,
 * gated or not, never from the gate obstacles. `behind` answers "has the player earned a REAL key" (the drop
 * check has to ask exactly that — a drop landing behind an ungated seam has earned nothing and must not trip
 * it). This one answers "do two regions meet ONLY here" — a question `regionLayout` alone can settle, so a
 * stray tree edge that would bridge two regions elsewhere is refused whether or not the topology mod ever
 * gates that seam. Kept apart rather than folded into `behind` for that reason: merging them would make an
 * UNGATED seam look, to the drop check, like a real door nothing has been earned toward.
 */
export const isolate = pass(
  "isolate",
  ["maze", "keys", "labels", "lay"],
  ["doors"],
  (prep, state) => {
    const { mainIsolated } = prep.hashes
    const { regionDoors, regionSeamDoors } = prep.layout
    const { n: N, mainPath } = state.maze
    const { chains } = state.keys
    const laid = state.lay?.laid
    const pkey = makePkey(N)
    // A hop across a designed room's floor is walked, but is no maze edge.
    const joins = roomJoins(state.blocks ?? [], N)
    const intended = new Set<string>()
    const gated = new Set<string>()
    const behind = new Map<string, Set<string>>()
    const needsDoor = (cellKey: string, door: string) =>
      behind.set(cellKey, (behind.get(cellKey) ?? new Set()).add(door))
    const seamGated = new Set<string>()
    const seamBehind = new Map<string, Set<string>>()
    const needsSeamDoor = (cellKey: string, door: string) =>
      seamBehind.set(cellKey, (seamBehind.get(cellKey) ?? new Set()).add(door))
    const markChain = ([pr, pc]: Cell, cells: readonly Cell[]) => {
      for (const [r, c] of cells) {
        if (!joins.has(pkey(pr, pc, r, c))) intended.add(pkey(pr, pc, r, c))
        ;[pr, pc] = [r, c]
      }
    }
    for (let mi = 0; mi < mainPath.length - 1; mi++) {
      const [r, c] = mainPath[mi]
      const [nr, nc] = mainPath[mi + 1]
      if (!joins.has(pkey(r, c, nr, nc))) intended.add(pkey(r, c, nr, nc))
    }
    // Isolation: cut a stretch off from the leftover maze edges, so no stray tree edge lets a player step past
    // what guards it. A gate asks for it, and `sealed` asks for it on an ordinary visible path — which is how a
    // trap gets it too: world-gen writes `sealed` on the section it gives a trap to (placeEncounters), so nothing
    // here has to read an encounter to lay out a floor. A chain stands behind its own door AND every ancestor's,
    // each written only where it exists: reaching it means going through the parent either way, so a chain with
    // no gate of its own is no further in than its parent is.
    //
    // A chain's doors are named once (`doorsShutting`) because the section hash records exactly whether there
    // are any, so hash and layout cannot drift apart: a floor forgets a run's progress only when its corridors
    // really changed.
    //
    // Every consecutive main-path edge is already `intended` above, so isolating the main path only blocks
    // *extra* leftover edges that would merge a shortcut around a puzzle room.
    if (mainIsolated)
      for (const cell of mainPath) {
        gated.add(keyOf(cell))
        needsDoor(keyOf(cell), MAIN_SECTION_ADDRESS)
      }
    // The ways a lock laid are walked ways, every one of them.
    for (const key of laid?.passages ?? []) intended.add(key)
    // Ground a stray maze edge may not leave: a path hung off laid ground answers to the ground it hangs from.
    const ground = new Map<string, string>(laid?.ground)
    for (const chain of chains) {
      if (laid && !chain.laid) {
        const hangsFrom = ground.get(keyOf(chain.attachedAt))
        if (hangsFrom !== undefined) for (const cell of chain.cells) ground.set(keyOf(cell), hangsFrom)
      }
      markChain(chain.attachedAt, [...(chain.via ?? []), ...chain.cells])
      if (chain.doors.length === 0) continue
      for (const cell of chain.cells) {
        gated.add(keyOf(cell))
        for (const door of chain.doors) needsDoor(keyOf(cell), door)
      }
    }
    // A sealed section filled into laid nodes stands behind its own seal as a sealed chain does: only the lay's
    // passages, all of them intended, reach its rooms.
    for (const { section, cells } of laid?.absorbed ?? []) {
      const doors = doorsShutting(prep.sections.sideSections[section], `s${section}`, [])
      for (const cellKey of cells) {
        if (doors.length > 0) gated.add(cellKey)
        for (const door of doors) needsDoor(cellKey, door)
      }
    }

    // A CELL IN A GATED REGION STANDS BEHIND EVERY OBSTACLE BOUNDING IT, written into the same map the authored
    // gates and traps use — so a one-way falling into a gated region, a stray tree edge beside one and the fog
    // are all answered by one notion of "what must be earned to stand here". Read off the settled labels (main
    // path AND chains, a chain inheriting its host's region), so a chain grown inside a gated region is gated
    // with it.
    if (regionDoors)
      for (const [cellKey, region] of state.labels.region)
        for (const id of regionDoors.get(region) ?? []) {
          gated.add(cellKey)
          needsDoor(cellKey, gateKeyOf(prep.input.floorRef, id))
        }
    // THE STRUCTURAL TWIN OF THE MARKING ABOVE — every connection `regionLayout` declares stands in for an
    // obstacle here, gated or not, so `edgeAllowed`'s bypass check reserves the same stray edges whether or not
    // the topology mod is in the build.
    if (regionSeamDoors)
      for (const [cellKey, region] of state.labels.region)
        for (const id of regionSeamDoors.get(region) ?? []) {
          seamGated.add(cellKey)
          needsSeamDoor(cellKey, id)
        }

    state.doors = { intended, gated, behind, ground, seamGated, seamBehind }
  },
  ["blocks"]
)
