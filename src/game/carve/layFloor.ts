import { layLockPlan } from "../layLocks"
import {
  answerBareStubs,
  fillLaidFloor,
  lengthenPlan,
  lengtheningCandidates,
  placeContentOnRoute,
  seatLaidFloor,
} from "../laidFloor"
import type { LengtheningChoice } from "../laidFloor"
import { spreadContentIndices } from "./grid"
import type { Pass } from "./state"

// What separates the lay of one attempt from the next.
const LAY_SEED_STRIDE = 1000003
// The most stretches one attempt lengthens to hold a floor's content before it is given up as too tight.
const MAX_LENGTHENINGS = 12

/**
 * A LOCK FLOOR IS LAID BEFORE ANYTHING IS CARVED AROUND IT: the route, the arms, the junction, the drops and
 * every region stand on the lattice already, so what follows reads them rather than deriving them. The lay
 * has its own stream, so a floor without locks draws exactly what it always drew.
 *
 * THE FLOOR'S OWN CONTENT IS FILLED INTO WHAT IS LAID, and where the laid stretches are too short for it the
 * plan asks the lay for more nodes on the cheapest stretch and lays again, rather than growing a branch.
 *
 * Every lay that holds grows the grid, and the next attempt starts from it even when this one refuses.
 */
export const layFloor: Pass<"rung" | "attempt", "lay" | "laidN"> = (prep, state) => {
  const { layPlan, junctionNodes, contentCount, leverOnMain } = prep.sizing
  const { plan, seed, answerStubs, onLaid } = prep.input
  const { absorbedDemands, appetiteOfRegion } = prep.sections
  if (!layPlan || !plan) {
    state.lay = null
    return
  }
  let n = state.rung.n
  let lengthPlan = layPlan
  const lengthened: LengtheningChoice[] = []
  for (;;) {
    const result = layLockPlan(lengthPlan, { seed: seed + state.attempt * LAY_SEED_STRIDE, n })
    if (!result.ok) return { retry: [{ type: "lockNotLaid", ...result.refusal }] }
    n = result.laid.n
    state.laidN = n
    const seated = seatLaidFloor(plan, result.laid)
    // Each junction `forks` holds keeps a route node inside its region (no seam) that no room takes.
    const kept: number[] = []
    for (let k = 0; k < junctionNodes; k++) {
      const step = seated.route.findIndex(
        (_, i) =>
          i > 0 &&
          i < seated.route.length - 1 &&
          !seated.reserved.has(i) &&
          !kept.includes(i) &&
          seated.routeLabels[i] === seated.routeLabels[i - 1]
      )
      if (step >= 0) kept.push(step)
    }
    const onMain = placeContentOnRoute(
      kept.length > 0 ? { ...seated, reserved: new Set([...seated.reserved, ...kept]) } : seated,
      spreadContentIndices(contentCount, 1, seated.route.length),
      { leverFirst: leverOnMain, appetite: appetiteOfRegion }
    )
    if (onMain === undefined) return { retry: [] }
    const filled = fillLaidFloor(
      seated,
      new Set([...onMain, ...kept].map(step => `${seated.route[step][0]},${seated.route[step][1]}`)),
      absorbedDemands,
      appetiteOfRegion
    )
    if ("placed" in filled) {
      const laid = { ...seated, absorbed: filled.placed, lengthened }
      const answered = answerStubs ? answerBareStubs(plan, laid, absorbedDemands, appetiteOfRegion) : laid
      onLaid?.(answered)
      state.lay = { laid: answered, mainSteps: onMain }
      return
    }
    const considered = lengtheningCandidates(lengthPlan, seated, filled.missing, appetiteOfRegion)
    const [cheapest] = considered
    if (cheapest === undefined || lengthened.length >= MAX_LENGTHENINGS)
      return { retry: [{ type: "contentNotLaid", kinds: filled.missing.map(({ kind }) => kind) }] }
    lengthened.push({ kind: cheapest.kind, id: cheapest.id, nodes: cheapest.nodes, considered })
    lengthPlan = lengthenPlan(lengthPlan, seated, cheapest)
  }
}
