import { hashString } from "@/support/hashString"
import { adjacencyFaults, dropLandingFaults, gateDoorFaults } from "../carveAgreement"
import { cellSlot } from "../cellSlot"
import type { Mark } from "../mark"
import { corridorIndexOf } from "../obstacles"
import { appetiteAccepts } from "../regions"
import type { ContentKind } from "../regions"
import { switchAddress } from "../seeds/boardIndex"
import { placeSequences } from "../sequenceTiles"
import { MECHANISM_AT_REST } from "../siteTypes"
import type { Direction } from "../siteTypes"
import { validateSite } from "../siteValidator"
import { placeWeights } from "../weightsPlates"
import { keyOf, nodeExitsOf } from "./derive"
import { gateKeyOf, gatesOwnedBy, obstacleMode, switchMark } from "./ids"
import { renderGround, renderShut } from "./render"
import type { RenderState, WritableGrid } from "./render"
import { encounterStyle } from "./roomSpecs"
import { MAIN_SECTION_ADDRESS } from "./sections"
import type { CarveState, FloorPrep, Refusal } from "./state"

/** What settling reads beyond the renderer: the reserved junctions, the `{ in }` forks' junctions and the chains. */
export type SettleState = RenderState & Pick<Required<CarveState>, "forks" | "junctions" | "keys">

const at = (pk: string): [number, number] => {
  const [r, c] = pk.split(",").map(Number)
  return [r, c]
}

/**
 * WHAT IS STILL WRITTEN ONTO THE FINISHED GRID, and the checks that read it, in the order the carve has always
 * asked them: the carve with its reserved junctions open and with them all shut, switches and fork-switches stood in their junctions, marks
 * painted, what each region will take, the carve against its layout, then sequence tiles and plates. Each write
 * here waits to become a pass's decision and a write in `render`; until then this is the one step that both
 * decides and writes.
 *
 * A switch's marks are this attempt's own: a door minted on a junction another attempt reserved is no door here.
 */
export const settle = (prep: FloorPrep, state: SettleState, grid: WritableGrid): Refusal | void => {
  const { siteId, floorRef, resolveEncounter, resolveBoardIndex } = prep.input
  const { config, authored } = prep.config
  const { allocation, markByGateKey } = prep.marks
  const { switchesPlaced } = state.forks
  const ground = renderGround(prep, state)
  const { mainPath } = state.maze
  const laid = state.lay?.laid
  const cells2D = grid.cells
  const N = grid.rows
  const exitsOf = nodeExitsOf(state, state.switchDoors)
  const switchMarks = new Map<string, Mark>(
    state.switchWays
      .slice(0, switchesPlaced)
      .flatMap((ways, n) => ways.map(({ gateKeyId }) => [gateKeyId, switchMark(prep, n)] as const))
  )
  const markOf = (gateKeyId: string) => markByGateKey.get(gateKeyId) ?? switchMarks.get(gateKeyId)

  // Two rooms of one section that a save cannot tell apart is a data-loss bug in the AUTHORING, so it fails the
  // floor outright: every seed produces it.
  const duplicateSlot = (view: WritableGrid = grid): Refusal | undefined => {
    const slotsSeen = new Set<string>()
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const slot = cellSlot(view, r, c)
        if (!slot) continue
        const cell = view.cells[r][c]
        const named = `${(cell.type !== "empty" && cell.sectionAddress) || MAIN_SECTION_ADDRESS}/${slot}`
        if (slotsSeen.has(named)) return { fatal: [{ type: "duplicateCellSlot", slot: named }] }
        slotsSeen.add(named)
      }
    return undefined
  }

  const bareDuplicate = duplicateSlot(ground)
  if (bareDuplicate) return bareDuplicate

  // A CARVE HAS TO SURVIVE ITS RESERVED JUNCTIONS BEING CLOSED, AND SURVIVE THEM BEING OPEN — neither asked of
  // `switches`, so a mod being absent cannot change which attempt is kept. Each is a view of its own: the grid
  // itself shuts only the junctions a switch stands in.
  if (!validateSite(ground).valid) return { retry: [] }
  if (!validateSite(renderShut(prep, state)).valid) return { retry: [] }

  const placeStyle = encounterStyle(prep.config)

  // Asked again, because a switch's name only exists once a family is in the junction.
  if (config.switches) {
    const switchedDuplicate = duplicateSlot()
    if (switchedDuplicate) return switchedDuplicate
  }

  // A FORK-SWITCH IS THE JUNCTION A `{ in }` FORK LAID, with its encounter standing in it. Only the seams are its
  // doors — the gates its `owners` put on the first cell of each arm — and its states follow from them.
  const { forkIns } = prep.forks
  for (const control of prep.mechanisms.forkSwitches) {
    const k = forkIns.findIndex(fork => fork.region === control.in)
    const fork = forkIns[k]
    const junctionKey = keyOf(mainPath[state.junctions.order[k]])
    const [sr, sc] = at(junctionKey)
    const junction = cells2D[sr][sc]
    if (junction.type !== "room") throw new Error(`[siteAssembler] fork-switch junction ${junctionKey} is not a room`)
    const dirOfWay = new Map(exitsOf(junctionKey).map(({ dir, neighborKey }) => [neighborKey, dir]))
    const gateKeyByDir = new Map<Direction, string>()
    fork.seams.forEach(([from, to], j) => {
      const wayKey = laid
        ? laid.junctions[k].arms.find(
            arm => (arm.seam[0] === from && arm.seam[1] === to) || (arm.seam[0] === to && arm.seam[1] === from)
          )!.first
        : keyOf(
            state.keys.chains.find(chain => chain.parentIdx === undefined && chain.idx === fork.sectionIdxs[j])!
              .cells[0]
          )
      // A step in the board's region stands its tile as the arm's first room, so the door is the node beyond it.
      const steps = laid?.thresholds.has(wayKey)
        ? exitsOf(wayKey).filter(({ neighborKey }) => neighborKey !== junctionKey)
        : []
      const doorKey = steps.length === 1 ? steps[0].neighborKey : wayKey
      const [fr, fc] = at(doorKey)
      // The seam's own corridor: a layout corridor on this pair, never a falling one beside it.
      const onSeam = ([a, b]: readonly [string, string]) => (a === from && b === to) || (a === to && b === from)
      const gate = gatesOwnedBy(authored, control.id).find(
        gate =>
          onSeam(gate.at.between) &&
          prep.layout.layoutCorridors.some(
            corridor =>
              onSeam(corridor.between) && corridor.index === corridorIndexOf(gate) && corridor.drop === undefined
          )
      )!
      const door = cells2D[fr][fc]
      if (door.type !== "room" || door.requiredKeyId !== gateKeyOf(floorRef, gate.id))
        throw new Error(`[siteAssembler] gate ${gate.id} does not stand on the seam of ${control.id}'s arm`)
      gateKeyByDir.set(dirOfWay.get(wayKey)!, gateKeyOf(floorRef, gate.id))
    })
    const family = resolveEncounter(control.encounter, "puzzle")
    cells2D[sr][sc] = {
      ...junction,
      family: family.familyId,
      tags: family.tags,
      mechanismId: control.id,
      boardIndex:
        resolveBoardIndex?.(family.familyId, switchAddress(control.id)) ??
        hashString(`${gateKeyOf(floorRef, control.id)}|${family.familyId}`),
      exits: junction.exits?.map(exit => {
        const gateKeyId = gateKeyByDir.get(exit.dir)
        return gateKeyId ? { ...exit, gateKeyId } : exit
      }),
      mechanism: {
        states: [MECHANISM_AT_REST, ...gateKeyByDir.values()],
        initial: MECHANISM_AT_REST,
        returnsToInitial: true,
        positions: [...gateKeyByDir.values()].map(gateKeyId => ({ state: gateKeyId, gateKeyId })),
      },
      ...placeStyle,
    }
  }
  if (prep.mechanisms.forkSwitches.length > 0) {
    const standingDuplicate = duplicateSlot()
    if (standingDuplicate) return standingDuplicate
  }

  // WHICH MECHANISM DRIVES WHICH DOOR IS ONLY READABLE IF BOTH ENDS SAY SO: the mark goes on the mechanism's room
  // and on every door it owns, found by the key its positions carry or the key the door asks for.
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const cell = cells2D[r][c]
      if (cell.type !== "room") continue
      const key = cell.mechanism?.positions[0]?.gateKeyId ?? cell.requiredKeyId
      const own = cell.mechanismId
        ? (allocation.marks.get(cell.mechanismId) ?? allocation.marks.get(`handle:${cell.mechanismId}`))
        : undefined
      const mark = own ?? (key === undefined ? undefined : markOf(key))
      if (mark) cells2D[r][c] = { ...cell, mark }
      // Each way out a fork-switch owns carries what its own gate wears, which is what the board draws.
      const marked = cells2D[r][c]
      if (marked.type === "room" && marked.exits?.some(exit => exit.gateKeyId && markOf(exit.gateKeyId)))
        cells2D[r][c] = {
          ...marked,
          exits: marked.exits.map(exit => {
            const wayMark = exit.gateKeyId ? markOf(exit.gateKeyId) : undefined
            return wayMark ? { ...exit, mark: wayMark } : exit
          }),
        }
    }

  const { regionLayout } = prep.layout
  if (regionLayout) {
    // WHAT A ROOM HOLDS AGAINST WHAT ITS REGION WILL TAKE, reported per region and kind: a puzzle is a room with a
    // chain position, a reward is a room holding treasure or stock; a mechanism room is neither.
    const appetiteOf = new Map(regionLayout.regions.map(r => [r.name, r.appetite]))
    const willNotTake = new Map<string, { region: string; kind: ContentKind }>()
    for (const row of cells2D)
      for (const cell of row) {
        if (cell.type !== "room" || cell.region === undefined) continue
        const appetite = appetiteOf.get(cell.region)
        if (appetite === undefined) continue
        const holds: ContentKind[] = []
        if (cell.roomType === "encounter" && cell.pathIndex !== undefined) holds.push("puzzle")
        if (cell.reward !== undefined || cell.stock !== undefined || cell.tags?.includes("treasure"))
          holds.push("reward")
        for (const kind of holds)
          if (!appetiteAccepts(appetite, kind)) willNotTake.set(`${cell.region}|${kind}`, { region: cell.region, kind })
      }
    if (willNotTake.size > 0) return { retry: [{ type: "regionWillNotTake", mismatch: [...willNotTake.values()] }] }

    // THE CARVE AGAINST THE LAYOUT IT WAS DRAWN FROM, asked of the walls as `forks` carved them: a switch's doors
    // are no part of the layout, so whether a mod stands one in a reserved junction cannot change what this accepts.
    const { gateKeys, landsOnItsStretch, oneWayObstacles } = prep.obstacles
    const runCells = new Set(state.drops.flatMap(edge => edge.run))
    const dropIdsWithRuns = oneWayObstacles.map(o => ({
      o,
      edge: state.drops.find(edge => edge.obstacleId === o.id)!,
    }))
    const asCarved = ground.cells
    const faults = [
      ...adjacencyFaults(asCarved, regionLayout),
      ...gateDoorFaults(asCarved, gateKeys, runCells),
      ...dropLandingFaults(
        asCarved,
        dropIdsWithRuns
          .filter(({ o }) => !landsOnItsStretch.has(o.id))
          .map(({ o, edge }) => ({ id: o.id, region: o.at.between[1], landing: at(edge.to) })),
        gateKeys,
        runCells
      ),
      // A drop landing on its stretch lands on ground reaching the door of the first gate past it.
      ...dropLandingFaults(
        asCarved,
        dropIdsWithRuns.flatMap(({ o, edge }) =>
          landsOnItsStretch.has(o.id) ? [{ id: o.id, region: `${o.id}:landing`, landing: at(edge.to) }] : []
        ),
        [...landsOnItsStretch].map(([drop, gate]) => ({
          id: gate,
          between: [`${drop}:landing`, `${drop}:landing`] as [string, string],
          key: gateKeyOf(floorRef, gate),
        })),
        runCells
      ),
    ]
    if (faults.length > 0) return { retry: [{ type: "carveDisagreement", faults }] }
  }

  const shutWays = () => new Set(state.switchWays.flatMap(ways => ways.map(({ cell }) => cell)))
  const gateOf = (id: string) => {
    const mode = obstacleMode(authored, id)
    return { gateKeyId: gateKeyOf(floorRef, id), ...(mode ? { mode } : {}) }
  }

  // A SEQUENCE'S TILES STAND ON THE FINISHED CARVE and move no wall. A step whose region has no free node on some
  // way in fails the attempt: a longer path may have one.
  const { sequences, weights } = prep.mechanisms
  if (sequences.length > 0) {
    const unplaced = placeSequences(
      cells2D,
      grid,
      sequences.map(sequence => ({
        id: sequence.id,
        regions: sequence.steps.map(step => step.in),
        glyphs: sequence.steps.map((_, step) => allocation.tileGlyphs.get(`${sequence.id}#${step}`)!),
        gates: sequence.opens.done.map(gateOf),
        doorKey: gateKeyOf(floorRef, sequence.resetAt),
      })),
      shutWays()
    )
    if (unplaced) return { retry: [{ type: "sequenceTileNotPlaced", ...unplaced }] }
    const tileDuplicate = duplicateSlot()
    if (tileDuplicate) return tileDuplicate
  }

  // A LOCK'S PLATES STAND ON THE FINISHED CARVE the same way, after the tiles.
  if (weights.length > 0) {
    const unplaced = placeWeights(
      cells2D,
      weights.map(control => ({ control, gate: gateOf })),
      new Set(mainPath.map(keyOf)),
      siteId,
      shutWays()
    )
    if (unplaced) return { retry: [{ type: "plateNotPlaced", ...unplaced }] }
    const plateDuplicate = duplicateSlot()
    if (plateDuplicate) return plateDuplicate
  }
}
