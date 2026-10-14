import { seamIndexFor } from "../obstacles"
import { routeStepOf } from "./derive"
import type { Pass } from "./state"

/**
 * WHERE ONE REGION STOPS AND THE NEXT BEGINS, the gate nearest the way in stands: the route threads the
 * regions in order, so a connection on it is the seam between two consecutive stretches and the first
 * cell of the far stretch is the one the player has to walk into — which is where the bars belong. The
 * rest of a run is seated once content and junctions have taken their nodes. A laid floor's gates stand
 * where the lock laid them.
 *
 * ONLY A MAIN-PATH OBSTACLE ANSWERS HERE — one whose two regions are both on the route. An obstacle
 * touching an off-route region seats on the CHAIN it belongs to instead, which exists only once that
 * chain's own cells are carved — `topologyFaults` has already proven every obstacle seats SOMEWHERE, so
 * failing this test only ever means "ask the other question," never a genuine fault.
 *
 * A seam the carve did not produce is retried rather than refused: `regionOfStep` lays every floor's
 * route out as a gap-free concatenation, so with today's carve a route-adjacent obstacle's two regions
 * are never "both seated but not adjacent", and `mainPath.length` GROWS across the attempt budget.
 */
export const seatSeamGates: Pass<"regions" | "lay" | "maze", "seamGates"> = (prep, state) => {
  const { mainPathRuns } = prep.obstacles
  const { stepRegion } = state.regions
  const laid = state.lay?.laid
  const seamGates = new Map<string, number>()
  if (laid) {
    const stepOf = routeStepOf(state.maze)
    for (const [id, cell] of laid.gateDoor) {
      const step = stepOf.get(cell)
      if (step !== undefined) seamGates.set(id, step)
    }
  } else
    for (const run of mainPathRuns) {
      const seam = seamIndexFor(stepRegion, run.between)
      if (seam === undefined) continue
      const entersFirst = stepRegion[seam - 1] === run.between[0]
      const nearest = entersFirst ? run.gates[0] : run.gates[run.gates.length - 1]
      seamGates.set(nearest.id, seam)
    }
  if (!laid && seamGates.size < mainPathRuns.length) {
    const ids = mainPathRuns
      .flatMap(run => run.gates)
      .filter(o => !seamGates.has(o.id))
      .map(o => o.id)
    return { retry: [{ type: "obstacleSeamNotCarved", ids }] }
  }
  state.seamGates = seamGates
}
