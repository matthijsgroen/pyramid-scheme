import type { KeyColor } from "../siteTypes"
import { seatBarrierDoors } from "../obstacles"
import { absorbedCell, keyOf, regionDoorAt } from "./derive"
import { spreadContentIndices } from "./grid"
import { gateKeyOf, isHandleGate, leverRooms } from "./ids"
import {
  controlRoomSpec,
  endRoomSpec,
  floorKeysOfGate,
  leverSpec,
  familyOrdinals,
  puzzleRoomSpec,
  regionBarrierDoorSpec,
} from "./roomSpecs"
import { blockNodes } from "./reserveRooms"
import { pass } from "./state"
import type { RoomSpec, Shortfall } from "./state"

/**
 * CHAIN NODES: the gate at the head where one guards the way in, a lever behind it where one stands there, the
 * chain's own content spread through whatever room the carve gave it, the controls and region-barrier doors
 * its regions host, and its end room. One body for a path off the main walk and a path off one of those — the
 * two differ only in what the chain record already carries. A chain hung off a junction writes over the main
 * path's fork room there.
 */
export const chainRooms = pass(
  "chainRooms",
  ["keys", "labels", "chainGates", "lay", "maze", "mainBarrierDoors"],
  ["chainRooms"],
  (prep, state) => {
    const { keyGate } = prep.families
    const { floorRef } = prep.input
    const { leverAtPositional, offRouteControls } = prep.mechanisms
    const { regionBarriers } = prep.obstacles
    const { chainRegionsBySectionIdx } = prep.layout
    const { chains } = state.keys
    const { mainPath } = state.maze
    const laid = state.lay?.laid
    const absorbed = absorbedCell(state.lay)
    const doorAt = regionDoorAt(state.lay)
    const held = blockNodes(state.blocks)
    const rooms = new Map<string, RoomSpec>()
    // AN OFF-ROUTE CONTROL'S OWN SEATING, found chain by chain as each one's own content is placed — a control's
    // region may sit on any chain, so this is bookkeeping shared across every chain, checked complete only once
    // every chain has had its turn.
    const chainControlSeated = new Set<string>()
    const sawChainContentCandidate = new Set<string>()
    // EVERY DOOR OF EVERY REGION BARRIER, as the cells they stand on, grouped by barrier — the main path's here,
    // a side path's added as its chain is carved. A barrier with no entry once every chain has had its turn found
    // no chain to host its region.
    const barrierDoorCells = new Map<string, string[]>()
    for (const [step, { id }] of state.mainBarrierDoors)
      barrierDoorCells.set(id, [...(barrierDoorCells.get(id) ?? []), keyOf(mainPath[step])])

    for (const { section, cells, positional, idx, parentIdx, keyNodeId, keyHostColors, laid: laidChain } of chains) {
      // The door nodes of a designed room the chain ends in hold nothing: `last` is the first of them, or the end room.
      let last = cells.length - 1
      while (last > 0 && held.has(keyOf(cells[last - 1]))) last -= 1
      // A stretch a lock laid ends where the lock does, so it holds no end room and may seat on its last node.
      const seatable = laidChain ? cells.length : last
      const laidDoorIdx = new Set(laidChain ? cells.flatMap((cell, i) => (doorAt.has(keyOf(cell)) ? [i] : [])) : [])
      const isFloorKeyGate = section.gate?.type === "floor-key"
      const isTombKeyGate = section.gate?.type === "tomb-key"
      // An authored keyId is used verbatim; only an unauthored gate looks up the id the key-host chain assigned it.
      const authoredKeyId = isFloorKeyGate ? (section.gate as { keyId?: string }).keyId : undefined

      // AN OFF-ROUTE OBSTACLE'S GATE ROOM — written the identical way a main-path gate's is: furniture the
      // topology mod stands on a connection, wired to whichever control opens it. A different authoring
      // vocabulary from the floor-key/tomb-key gate below, standing at a different node — UNLESS this chain's own
      // mouth is where an obstacle seats, which always resolves to this same `cells[0]` the floor-key/tomb-key
      // block claims; that combination is refused by name before a single wall is carved
      // (`chainGateCollidesWithSectionGate`), so writing both here never has to decide which one wins.
      //
      // `parentIdx === undefined` is checked alongside `idx`: `chainGates` only ever keys by a TOP-LEVEL chain's
      // own `idx`, but a sub-chain's `idx` numbers its position among its OWN parent's sub-sections, starting
      // from 0 the same as a top-level chain's does, so `idx` alone can coincide between a top-level chain and an
      // unrelated sub-chain.
      const chainGateIndices = new Set<number>()
      if (parentIdx === undefined) {
        for (const [obstacleId, loc] of state.chainGates.at) {
          if (loc.idx !== idx) continue
          chainGateIndices.add(loc.cellIndex)
          rooms.set(keyOf(cells[loc.cellIndex]), {
            roomType: "encounter",
            // Owned by a control, so nothing stands in it (see the main path's obstacle gate).
            tags: keyGate.tags,
            requiredKeyId: gateKeyOf(floorRef, obstacleId),
            ...floorKeysOfGate(prep, chains, obstacleId),
          })
        }
      }
      let contentStart = 0

      // Gate node occupies cells[0] for gated chains
      if (isFloorKeyGate && keyNodeId) {
        const floorKeyGate = section.gate as { type: "floor-key"; color?: KeyColor }
        rooms.set(keyOf(cells[0]), {
          roomType: "encounter",
          // A lever's door wears the bars and holds nothing to enter or tap — see `isHandleGate`.
          ...(isHandleGate(prep, positional) ? {} : { family: keyGate.familyId }),
          tags: keyGate.tags,
          requiredKeyId: keyNodeId,
          gateVariant: "floor-key",
          // The colour is the sign saying which CHEST on this floor holds the key. An authored key is minted by a
          // room instead and grows no chest, so defaulting one here would put the door in the HUD key ring
          // (src/game/floorKeys.ts) pointing at a chest that does not exist. An author who names a colour anyway
          // still gets it.
          ...(floorKeyGate.color
            ? { keyColor: floorKeyGate.color }
            : authoredKeyId
              ? {}
              : { keyColor: "blue" as const }),
          ...(authoredKeyId ? { keyIsAuthored: true } : {}),
        })
        contentStart = 1
      } else if (isTombKeyGate) {
        const tombGate = section.gate as { type: "tomb-key"; wardKeyId: string }
        rooms.set(keyOf(cells[0]), {
          roomType: "encounter",
          family: keyGate.familyId,
          tags: keyGate.tags,
          requiredKeyId: tombGate.wardKeyId,
          gateVariant: "tomb-key",
        })
        contentStart = 1
      }

      // A TOPOLOGY GATE AT OR AHEAD OF `contentStart` CLAIMS THAT CELL TOO — advanced past exactly like a
      // main-path gate advances the main path's content: the room there is the gate's, not content's, whichever
      // authoring vocabulary put it there. Never past `cells.length - 1`, the chain's own end room, reserved
      // unconditionally below (`checkChainsSeated` already refused an attempt where a gate would have landed there).
      while (chainGateIndices.has(contentStart) && contentStart < last) contentStart += 1

      // A lever stands at the head of its chain, past whatever gate guards the way in: the player reaches it
      // before the content, and throwing it is a walk back out rather than a room solved deeper in. A gate
      // leaving no room ahead of it at all is the same shortfall the puzzle spread below retries for, asked one
      // node earlier. Its own index is kept (`leverIndexInChain`) so the control search below can exclude it the
      // same way the main path's own search excludes the main path's lever.
      let leverIndexInChain = -1
      if (leverRooms(leverAtPositional, positional) === 1) {
        if (contentStart >= last) return { retry: [] }
        leverIndexInChain = contentStart
        rooms.set(keyOf(cells[contentStart]), leverSpec(prep, positional))
        contentStart += 1
        while (chainGateIndices.has(contentStart) && contentStart < last) contentStart += 1
      }

      // Intermediate nodes (puzzles/traps) — spread across whatever room `paddedChainLength` gave this chain (see
      // spreadContentIndices), same technique as the main path, instead of assumed-consecutive from contentStart
      // (which only ever held when a chain was exactly its bare content length). Indices map through
      // `contentIndices`, so a multi-puzzle chain indexes its own content rather than past it.
      //
      // A GATE CELL AND A PUZZLE CANNOT BOTH STAND IN ONE CELL EITHER, same rule and same technique as the main
      // path's own content: forward to the next free node, so one layout always places the same way. Runs out of
      // room only where a gate leaves fewer free cells than this chain's own `pathPuzzles` asks for, in which case
      // this attempt retries the same way a main-path shortfall does — a wider chain (`chainPacking`) may fit both.
      const contentIndices: number[] = []
      for (const wanted of spreadContentIndices(section.pathPuzzles, contentStart, last + 1)) {
        let index = wanted
        while (index < last && (chainGateIndices.has(index) || contentIndices.includes(index))) index += 1
        if (index >= last) break
        contentIndices.push(index)
      }
      if (contentIndices.length < section.pathPuzzles) return { retry: [] }

      // A CONTROL HOSTED BY THIS CHAIN'S OWN REGION(S) — the identical search the main path's own runs
      // (`seatMainControls`: a free node preferred; only once none is free does it take a puzzle's node,
      // displacing that puzzle onward rather than refusing quietly), asked of this chain's own cells instead. A
      // chain's own puzzle ordinal IS its position in `contentIndices` — displacing here only ever moves which
      // CELL a position points at, never the position itself, so this needs no ordinal-preserving map of its own
      // the way the main path's `puzzleRole` does.
      const chainRegionAt = (i: number) => state.labels.region.get(keyOf(cells[i]))
      const takenByChainControl = new Set<number>()
      for (const { control, record } of offRouteControls) {
        if (chainControlSeated.has(control.id)) continue
        const inThisChain = (i: number) =>
          i < seatable &&
          chainRegionAt(i) === control.in &&
          !chainGateIndices.has(i) &&
          !laidDoorIdx.has(i) &&
          !absorbed.has(keyOf(cells[i])) &&
          !laid?.thresholds.has(keyOf(cells[i])) &&
          i !== leverIndexInChain &&
          !takenByChainControl.has(i)

        let seatIndex: number | undefined
        for (let i = 0; i < seatable; i++) {
          if (inThisChain(i) && !contentIndices.includes(i)) {
            seatIndex = i
            break
          }
        }
        if (seatIndex === undefined) {
          for (let k = 0; k < contentIndices.length; k++) {
            const i = contentIndices[k]
            if (!inThisChain(i)) continue
            sawChainContentCandidate.add(control.id)
            // `takenByChainControl` excluded here too, not just from the free-node search above: a second
            // control's displacement destination must not land on a node a first control this same chain already
            // seated.
            let shifted = i + 1
            while (
              shifted < seatable &&
              (chainGateIndices.has(shifted) || contentIndices.includes(shifted) || takenByChainControl.has(shifted))
            )
              shifted += 1
            if (shifted >= seatable) continue // nowhere to move this one — try the chain's next content node
            contentIndices[k] = shifted
            seatIndex = i
            break
          }
        }
        if (seatIndex === undefined) continue // this chain hosts none of this control's region — try the next chain
        chainControlSeated.add(control.id)
        takenByChainControl.add(seatIndex)
        rooms.set(keyOf(cells[seatIndex]), controlRoomSpec(prep, control, record, cells[seatIndex]))
      }

      // The doors a lock laid on this stretch stand where it laid them.
      for (const i of laidDoorIdx) {
        const key = keyOf(cells[i])
        const door = doorAt.get(key)!
        rooms.set(key, regionBarrierDoorSpec(prep, chains, door.barrier, door.region, door.entrance))
        barrierDoorCells.set(door.barrier, [...(barrierDoorCells.get(door.barrier) ?? []), key])
      }

      // A REGION BARRIER HOSTED BY THIS CHAIN gets its doors from the cells nothing else here claims, once content
      // and controls have settled where they stand.
      const hostedHere = parentIdx === undefined ? chainRegionsBySectionIdx.get(idx) : undefined
      if (hostedHere) {
        const claimedHead = (isFloorKeyGate && keyNodeId !== undefined) || isTombKeyGate
        const barrierCells = new Set<number>()
        for (const barrier of regionBarriers) {
          if (!hostedHere.regions.includes(barrier.at.region)) continue
          const doors = seatBarrierDoors(
            [hostedHere.mouth, ...cells.map(chainCell => state.labels.region.get(keyOf(chainCell)))],
            barrier.at.region,
            step => {
              const cell = step - 1
              return (
                cell >= (claimedHead ? 1 : 0) &&
                cell < last &&
                !chainGateIndices.has(cell) &&
                !contentIndices.includes(cell) &&
                cell !== leverIndexInChain &&
                !takenByChainControl.has(cell) &&
                !barrierCells.has(cell)
              )
            }
          )
          if (!doors) return { retry: [{ type: "regionBarrierNotSeated", id: barrier.id, region: barrier.at.region }] }
          for (const { entrance, step } of doors) {
            const key = keyOf(cells[step - 1])
            barrierCells.add(step - 1)
            rooms.set(key, regionBarrierDoorSpec(prep, chains, barrier.id, barrier.at.region, entrance))
            barrierDoorCells.set(barrier.id, [...(barrierDoorCells.get(barrier.id) ?? []), key])
          }
        }
      }

      const ordinalOf = familyOrdinals()
      for (let pi = 0; pi < section.pathPuzzles; pi++)
        rooms.set(keyOf(cells[contentIndices[pi]]), puzzleRoomSpec(prep, section, positional, pi, ordinalOf))

      // A stretch a lock laid ends with the lock's own room, or in none.
      if (laidChain) continue

      const end = cells[cells.length - 1]
      rooms.set(keyOf(end), endRoomSpec(prep, section, positional, keyHostColors, end))
    }

    // Two shortfalls, reported under the SAME names the main-path search uses — a control that matched no chain
    // node at all is `controlNotSeated`, one whose only candidate already held a puzzle with nowhere to move it is
    // `controlPuzzleUndisplaceable` — kept apart the identical way, for the identical reason: a wider chain
    // (`chainPacking`) rescues both, so both retry rather than refuse. Checked once every chain has had its turn,
    // since a control's own region may be seated on any one of them.
    if (chainControlSeated.size < offRouteControls.length) {
      const stillUnseated = offRouteControls.filter(({ control }) => !chainControlSeated.has(control.id))
      const bare = stillUnseated.filter(({ control }) => !sawChainContentCandidate.has(control.id))
      const displaceable = stillUnseated.filter(({ control }) => sawChainContentCandidate.has(control.id))
      const retry: Shortfall[] = []
      if (bare.length > 0) retry.push({ type: "controlNotSeated", ids: bare.map(({ control }) => control.id) })
      if (displaceable.length > 0)
        retry.push({ type: "controlPuzzleUndisplaceable", ids: displaceable.map(({ control }) => control.id) })
      return { retry }
    }

    // A BARRIER ON A REGION NO CHAIN HOSTED THIS ATTEMPT has no door at all, which is the same shortfall as one
    // whose entrance had no free step: refused by the barrier's name rather than set anywhere else.
    const unhosted = regionBarriers.find(barrier => !barrierDoorCells.has(barrier.id))
    if (unhosted) return { retry: [{ type: "regionBarrierNotSeated", id: unhosted.id, region: unhosted.at.region }] }

    state.chainRooms = rooms
  },
  ["blocks"]
)
