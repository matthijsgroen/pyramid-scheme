import { adjacencyFaults, dropLandingFaults, gateDoorFaults } from "../carveAgreement"
import { cellSlot } from "../cellSlot"
import { appetiteAccepts } from "../regions"
import type { ContentKind } from "../regions"
import type { FloorGrid } from "../siteTypes"
import { validateSite } from "../siteValidator"
import { gateKeyOf } from "./ids"
import { renderGround, renderShut } from "./render"
import type { RenderState, WritableGrid } from "./render"
import { MAIN_SECTION_ADDRESS } from "./sections"
import type { CarveState, FloorPrep, Refusal } from "./state"

/** What settling reads beyond the renderer: the reserved junctions, the `{ in }` forks' junctions and the chains. */
export type SettleState = RenderState & Pick<Required<CarveState>, "forks" | "junctions" | "keys">

const at = (pk: string): [number, number] => {
  const [r, c] = pk.split(",").map(Number)
  return [r, c]
}

/**
 * Two rooms of one section that a save cannot tell apart is a data-loss bug in the AUTHORING, so it fails the
 * floor outright: every seed produces it.
 */
export const duplicateSlot = (grid: FloorGrid): Refusal | undefined => {
  const slotsSeen = new Set<string>()
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const slot = cellSlot(grid, r, c)
      if (!slot) continue
      const cell = grid.cells[r][c]
      const named = `${(cell.type !== "empty" && cell.sectionAddress) || MAIN_SECTION_ADDRESS}/${slot}`
      if (slotsSeen.has(named)) return { fatal: [{ type: "duplicateCellSlot", slot: named }] }
      slotsSeen.add(named)
    }
  return undefined
}

/**
 * THE CHECKS THAT READ THE RENDERED GRID, in the order the carve has always asked them: the carve with its
 * reserved junctions open and with them all shut, the switches' names, what each region will take, and the
 * carve against its layout.
 */
export const settle = (prep: FloorPrep, state: SettleState, grid: WritableGrid): Refusal | void => {
  const { floorRef } = prep.input
  const { config } = prep.config
  const ground = renderGround(prep, state)

  const bareDuplicate = duplicateSlot(ground)
  if (bareDuplicate) return bareDuplicate

  // A CARVE HAS TO SURVIVE ITS RESERVED JUNCTIONS BEING CLOSED, AND SURVIVE THEM BEING OPEN — neither asked of
  // `switches`, so a mod being absent cannot change which attempt is kept. Each is a view of its own: the grid
  // itself shuts only the junctions a switch stands in.
  if (!validateSite(ground).valid) return { retry: [] }
  if (!validateSite(renderShut(prep, state)).valid) return { retry: [] }

  // Asked again, because a switch's name only exists once a family is in the junction.
  if (config.switches) {
    const switchedDuplicate = duplicateSlot(grid)
    if (switchedDuplicate) return switchedDuplicate
  }

  // Asked again, because a fork-switch's name only exists once its encounter stands in the junction.
  if (prep.mechanisms.forkSwitches.length > 0) {
    const standingDuplicate = duplicateSlot(grid)
    if (standingDuplicate) return standingDuplicate
  }

  const { regionLayout } = prep.layout
  if (regionLayout) {
    // WHAT A ROOM HOLDS AGAINST WHAT ITS REGION WILL TAKE, reported per region and kind: a puzzle is a room with a
    // chain position, a reward is a room holding treasure or stock; a mechanism room is neither.
    const appetiteOf = new Map(regionLayout.regions.map(r => [r.name, r.appetite]))
    const willNotTake = new Map<string, { region: string; kind: ContentKind }>()
    for (const row of grid.cells)
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
}
