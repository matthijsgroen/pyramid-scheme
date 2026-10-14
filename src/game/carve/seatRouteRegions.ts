import { regionsAlongPath } from "../regions"
import type { Pass } from "./state"

/**
 * WHICH REGION EACH MAIN-PATH STEP STANDS IN, where the floor authors one — absent everywhere on a floor
 * that does not. A laid floor's route carries its labels; otherwise each step takes its region from how
 * far along the route it stands. Known before content placement: the gate cells have to be known before
 * content claims a node.
 *
 * A ROUTE LONGER THAN THE PATH SEATS NOTHING AT ITS FAR END — `regionOfStep` deals what there is rather
 * than refusing (it has no floor in front of it; only a carve knows how many steps the main path has).
 * Checked against the route's own regions only: a region the route never threads at all is not this
 * cause's business (a side path seats those) and must not retry a longer main path forever waiting for a
 * route it is never on.
 *
 * EVERY MAIN-PATH SEAM, GATED OR NOT, is read off `stepRegion` alone, which `regionLayout` (core, never
 * dropped by `dropUnownedAuthoring`) fixes the moment `mainPath` does. Where an AUTHORED gate stands is
 * exactly what must NOT decide content pacing or candidate membership: the topology mod owns which of
 * these seams carries a gate, but not how many seams the layout has or where they fall, so a reservation
 * keyed off the seams reserves the same physical stretch whether the mod that might gate it is even in
 * the build.
 */
export const seatRouteRegions: Pass<"maze" | "lay", "regions"> = (prep, state) => {
  const { regionLayout, route, onRouteSet } = prep.layout
  const { mainPath } = state.maze
  const stepRegion = state.lay
    ? state.lay.laid.routeLabels
    : regionLayout
      ? regionsAlongPath(regionLayout, route, mainPath.length)
      : []
  const unseated = regionLayout
    ? regionLayout.regions.map(r => r.name).filter(name => onRouteSet.has(name) && !stepRegion.includes(name))
    : []
  if (unseated.length > 0) return { retry: [{ type: "regionNotSeated", regions: unseated }] }
  const seams = new Set<number>()
  for (let step = 1; step < stepRegion.length; step++) if (stepRegion[step] !== stepRegion[step - 1]) seams.add(step)
  state.regions = { stepRegion, seams }
}
