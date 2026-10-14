import { seatBarrierDoors } from "../obstacles"
import { gateIndices, routeStepOf } from "./derive"
import type { Pass } from "./state"

/**
 * A REGION BARRIER ON THE MAIN PATH gets a door at each entrance, taken from the nodes nothing else claims —
 * read off the finished content so no puzzle, junction or seam is moved for it. A door the path cannot seat
 * fails the attempt: a longer path may, and the last attempt names the barrier. A laid floor's doors stand
 * where the lock laid them.
 */
export const seatMainBarrierDoors: Pass<
  "maze" | "regions" | "content" | "junctions" | "seamGates" | "runGates" | "lay",
  "mainBarrierDoors"
> = (prep, state) => {
  const { mainPath } = state.maze
  const { stepRegion } = state.regions
  const { placed } = state.content
  const laid = state.lay?.laid
  const gated = gateIndices(state)
  const doors = new Map<number, { id: string; region: string; entrance: string }>()
  const stepOf = routeStepOf(state.maze)
  for (const door of laid?.regionDoors ?? []) {
    const [dr, dc] = door.cell.split(",").map(Number)
    const step = stepOf.get(`${dr},${dc}`)
    if (step !== undefined) doors.set(step, { id: door.barrier, region: door.region, entrance: door.entrance })
  }
  for (const barrier of laid ? [] : prep.obstacles.regionBarriers) {
    if (!prep.layout.onRouteSet.has(barrier.at.region)) continue
    const seated = seatBarrierDoors(
      stepRegion,
      barrier.at.region,
      step =>
        step > 0 &&
        step < mainPath.length - 1 &&
        !placed.includes(step) &&
        !state.junctions.steps.has(step) &&
        !gated.has(step) &&
        !doors.has(step)
    )
    if (!seated) return { retry: [{ type: "regionBarrierNotSeated", id: barrier.id, region: barrier.at.region }] }
    for (const { entrance, step } of seated) doors.set(step, { id: barrier.id, region: barrier.at.region, entrance })
  }
  state.mainBarrierDoors = doors
}
