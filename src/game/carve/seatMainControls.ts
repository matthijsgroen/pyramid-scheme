import { absorbedCell, gateIndices } from "./derive"
import { pass } from "./state"
import type { Shortfall } from "./state"

/**
 * A CONTROL STANDS IN A REGION, so its room is A NODE OF THAT STRETCH — any main-path node, not only a
 * content-designated one, because content is spread for rhythm and is not guaranteed to put a node in every
 * region (a short early region can go unspread-into entirely — measured), while `seatRouteRegions` already
 * guarantees every declared region at least ONE step. Searching the whole path rather than the narrower
 * content set is what makes a control seatable on the SAME attempt core's own content already succeeds on,
 * whether or not the topology mod that owns it is even registered — the mod must not cost this floor an
 * extra retry the mod-off build never has to pay (docs/game-design/regions-and-containers.md's toggle-off
 * gate).
 *
 * ONLY `mainPathControls` IS SOUGHT HERE — a control hosted by an off-route region is sought within its own
 * chain instead, the same split the main-path and off-route gate runs make.
 *
 * A FREE NODE IS PREFERRED OVER A CONTENT ONE: the content nodes are the puzzles this floor already authored,
 * each already holding its own AUTHORED ORDINAL in `puzzleRole`. Seating a control directly on one of those
 * nodes would either carve the puzzle out from under it with nothing reported, or — filtering it back out
 * downstream instead — renumber every puzzle after it, sliding each one's reward, encounter override and
 * save slot onto a different room. Both are the "decide quietly" the governing rule of this whole area
 * forbids. So a content node is only taken once the region's free nodes are exhausted, and taking one
 * DISPLACES the puzzle it held forward to the next free node — a move the puzzle's ordinal follows rather
 * than one that drops or renumbers it — using the same forward shift content placement uses. Never past the
 * goal — content only ever stands before it (the pacing `spreadContentIndices` was chosen for), so the
 * shift's ceiling is the goal, not the path's end.
 *
 * Excludes the entrance (index 0, a portal room) and the exit (the last index, a dead end), and the lever's
 * node alongside the goal: that node already carries the main-path HANDLE's room (a different mechanism from
 * a different authoring vocabulary), and the room write-up tests the lever's node first — a control landing
 * there would compile successfully and then be silently dropped from the grid, a door nothing ever reports
 * as unseated.
 *
 * Two different shortfalls, reported apart because they call for different fixes. A control given NO
 * candidate node at all is `controlNotSeated`, and a wider path (packing widens at 8/16/24) is what rescues
 * it. A control whose only candidate already held a puzzle with nowhere to move it is
 * `controlPuzzleUndisplaceable` instead: a wider path helps this one too (more room past the candidate to
 * shift into), so it is retried the same way, just named for what actually went wrong. Both retried rather
 * than refused: `mainPath.length` GROWS across the attempt budget.
 */
export const seatMainControls = pass(
  "seatMainControls",
  ["maze", "regions", "content", "junctions", "seamGates", "runGates", "mainBarrierDoors", "lay"],
  ["mainControls"],
  (prep, state) => {
    const { mainPath } = state.maze
    const { stepRegion } = state.regions
    const { goal, lever } = state.content
    const laid = state.lay?.laid
    const gated = gateIndices(state)
    const absorbed = absorbedCell(state.lay)
    const doors = state.mainBarrierDoors
    const junctions = state.junctions.steps
    // The content as the controls seated so far have left it: a later control's search sees an earlier one's move.
    const placed = [...state.content.placed]
    const at = new Map<string, number>()
    const moves: [number, number][] = []
    const takenByControl = new Set<number>()
    // A control that reached the content-fallback search at all, whether or not it found room to displace
    // what it found there — tells "no candidate at all" apart from "a candidate stood, but nothing had room
    // for the puzzle it held".
    const sawContentCandidate = new Set<string>()
    const cellKeyAt = (mi: number) => `${mainPath[mi][0]},${mainPath[mi][1]}`
    for (const { control } of prep.mechanisms.mainPathControls) {
      const inRegion = (mi: number) =>
        stepRegion[mi] === control.in &&
        !takenByControl.has(mi) &&
        mi !== goal &&
        mi !== lever &&
        !gated.has(mi) &&
        !doors.has(mi) &&
        !junctions.has(mi) &&
        !absorbed.has(cellKeyAt(mi)) &&
        !laid?.thresholds.has(cellKeyAt(mi)) &&
        !laid?.bare.has(cellKeyAt(mi))

      let index: number | undefined
      for (let mi = 1; mi < mainPath.length - 1; mi++) {
        if (inRegion(mi) && !placed.includes(mi)) {
          index = mi
          break
        }
      }

      if (index === undefined) {
        for (let mi = 1; mi < mainPath.length - 1; mi++) {
          if (!inRegion(mi) || !placed.includes(mi)) continue
          sawContentCandidate.add(control.id)
          let shifted = mi + 1
          while (
            shifted < goal &&
            (gated.has(shifted) ||
              doors.has(shifted) ||
              placed.includes(shifted) ||
              takenByControl.has(shifted) ||
              junctions.has(shifted) ||
              absorbed.has(cellKeyAt(shifted)))
          )
            shifted += 1
          if (shifted >= goal) continue // nowhere to move this one — try the region's next content node
          placed[placed.indexOf(mi)] = shifted
          moves.push([mi, shifted])
          index = mi
          break
        }
      }

      if (index === undefined) continue
      at.set(control.id, index)
      takenByControl.add(index)
    }
    const { mainPathControls } = prep.mechanisms
    if (at.size < mainPathControls.length) {
      const stillUnseated = mainPathControls.filter(({ control }) => !at.has(control.id))
      const bare = stillUnseated.filter(({ control }) => !sawContentCandidate.has(control.id))
      const displaceable = stillUnseated.filter(({ control }) => sawContentCandidate.has(control.id))
      const retry: Shortfall[] = []
      if (bare.length > 0) retry.push({ type: "controlNotSeated", ids: bare.map(({ control }) => control.id) })
      if (displaceable.length > 0)
        retry.push({ type: "controlPuzzleUndisplaceable", ids: displaceable.map(({ control }) => control.id) })
      return { retry }
    }
    state.mainControls = { at, moves }
  }
)
