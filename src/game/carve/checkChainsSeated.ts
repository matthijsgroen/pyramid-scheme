import { gateIndexOf } from "./derive"
import { pass } from "./state"

/**
 * WHAT THE CHAINS HAD TO SEAT, checked once every chain's cells are labelled — the only point a side chain's
 * own length is known.
 *
 * A DECLARED REGION NO CELL EVER TOOK: this is the one region check that cannot run before the carve
 * (docs/game-design/regions-and-containers.md, "one refusal necessarily runs after the carve"). Two ways here:
 * a side chain shorter than the component matched to it, so `regionOfStep` seated the near end and left the
 * rest off (same shortfall the main path's `unseated` check catches for the route, one carve later); or more
 * off-route components than the floor authors top-level side sections for, so `chainRegionsBySectionIdx`
 * never matched one at all.
 *
 * AN OFF-ROUTE OBSTACLE'S OWN SEAM, for the same reason: a chain's own cells, and so its seam, exist only once
 * the carve produces them. A region the chain never got to seat is one cause; a genuinely un-carved seam
 * within an otherwise-seated chain is the other. A short run noted by `seatChainGates` is the cause where
 * there is one, and the loop names that instead.
 *
 * A GATE AT A CHAIN'S OWN LAST CELL WOULD STAND WHERE THE END ROOM MUST — every chain reserves that cell
 * unconditionally, the same way the main path's own last index is reserved for the exit.
 *
 * All three are retried rather than refused: a wider chain, which `chainPacking` grows across the attempt
 * budget the same way `packing` grows the main path, may seat what this one did not.
 */
export const checkChainsSeated = pass(
  "checkChainsSeated",
  ["labels", "chainGates", "keys", "lay", "seamGates", "runGates"],
  [],
  (prep, state) => {
    const { regionLayout } = prep.layout
    const { gateObstacles } = prep.obstacles
    const { at } = state.chainGates
    if (regionLayout) {
      const seated = new Set(state.labels.region.values())
      const regions = regionLayout.regions.map(r => r.name).filter(name => !seated.has(name))
      if (regions.length > 0) return { retry: [{ type: "regionNotSeated", regions }] }
    }

    const onRoute = gateIndexOf(state)
    const offRouteGates = state.lay
      ? gateObstacles.filter(o => !onRoute.has(o.id))
      : prep.obstacles.offRouteRuns.flatMap(run => run.gates)
    if (at.size < offRouteGates.length) {
      const ids = offRouteGates.filter(o => !at.has(o.id)).map(o => o.id)
      return { retry: [{ type: "obstacleSeamNotCarved", ids, onChain: true }] }
    }

    const crowdsEnd = [...at.values()].some(({ idx, cellIndex }) => {
      const host = state.keys.chains.find(c => c.parentIdx === undefined && c.idx === idx)
      return !host?.laid && cellIndex === (host?.cells.length ?? 0) - 1
    })
    if (crowdsEnd) return { retry: [] }
  }
)
