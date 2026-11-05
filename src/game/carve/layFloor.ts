import { layLockPlan } from "../layLocks"
import type { LaidLocks } from "../layLocks"
import {
  answerBareStubs,
  fillLaidFloor,
  lengthenPlan,
  lengtheningCandidates,
  placeContentOnRoute,
  seatLaidFloor,
  trimBareTails,
} from "../laidFloor"
import type { LengtheningChoice } from "../laidFloor"
import type { LockPlan } from "../lockPlan"
import { spreadContentIndices } from "./grid"
import { blockAsks } from "./reserveRooms"
import { pass } from "./state"

// What separates the lay of one attempt from the next.
const LAY_SEED_STRIDE = 1000003
// The most stretches one attempt lengthens to hold a floor's content before it is given up as too tight.
const MAX_LENGTHENINGS = 12

/**
 * A LOCK FLOOR'S ROUTE IS LAID AT THE FLOOR'S LENGTH, as every floor's is: what its on-route regions and corridors ask
 * for falls short of `targetDistance` by a deficit its on-route corridors share evenly. A route the lock already
 * makes long enough is laid as planned.
 */
export const routeOfLength = (plan: LockPlan, targetDistance: number): LockPlan => {
  const onRoute = plan.corridors.filter(corridor => corridor.onRoute)
  const asked = [...plan.regions, ...plan.corridors]
    .filter(stretch => stretch.onRoute)
    .reduce((sum, stretch) => sum + stretch.minNodes, 0)
  const deficit = targetDistance - asked
  if (deficit <= 0 || onRoute.length === 0) return plan
  const share = (i: number) => Math.floor(deficit / onRoute.length) + (i < deficit % onRoute.length ? 1 : 0)
  return {
    ...plan,
    corridors: plan.corridors.map(corridor => {
      const i = onRoute.indexOf(corridor)
      return i < 0 ? corridor : { ...corridor, minNodes: corridor.minNodes + share(i) }
    }),
  }
}

/**
 * A LOCK FLOOR IS LAID BEFORE ANYTHING IS CARVED AROUND IT: the route, the arms, the junction, the drops and
 * every region stand on the lattice already, so what follows reads them rather than deriving them. The lay
 * has its own stream, so a floor without locks draws exactly what it always drew.
 *
 * THE FLOOR'S OWN CONTENT IS FILLED INTO WHAT IS LAID, and where the laid stretches are too short for it the
 * plan asks the lay for more nodes on the cheapest stretch and lays again, rather than growing a branch. A side
 * section assigned to a corridor stands wholly on it; a fill that seats one of its rooms elsewhere is refused.
 *
 * The route is laid at the floor's length (`routeOfLength`); where the lattice holds no route that long, as short as
 * the lock allows.
 *
 * Every lay that holds grows the grid, and the next attempt starts from it even when this one refuses.
 */
export const layFloor = pass("layFloor", ["rung", "attempt"], ["lay", "laidN"], (prep, state) => {
  const { layPlan, junctionNodes, contentCount, leverOnMain } = prep.sizing
  const { plan, seed, answerStubs, onLaid } = prep.input
  const { absorbedDemands, appetiteOfRegion } = prep.sections
  if (!layPlan || !plan) {
    state.lay = null
    state.laidN = state.rung.n
    return
  }
  let n = state.rung.n
  const atLength = routeOfLength(layPlan, state.rung.targetDistance)
  let lengthPlan = atLength
  const lengthened: LengtheningChoice[] = []
  const blocks = blockAsks(prep, state.attempt)
  const rooms = new Set(blocks.map(({ region }) => region))
  for (;;) {
    const lay = () => layLockPlan(lengthPlan, { seed: seed + state.attempt * LAY_SEED_STRIDE, n, blocks })
    let result = lay()
    if (!result.ok && lengthPlan === atLength && atLength !== layPlan) {
      lengthPlan = layPlan
      result = lay()
    }
    if (!result.ok) return { retry: [{ type: "lockNotLaid", ...result.refusal }] }
    n = result.laid.n
    state.laidN = n
    const seatAndFill = (laidLocks: LaidLocks) => {
      const seated = seatLaidFloor(plan, laidLocks)
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
      if (onMain === undefined) return undefined
      const taken = new Set([
        ...[...onMain, ...kept].map(step => `${seated.route[step][0]},${seated.route[step][1]}`),
        ...seated.bare,
      ])
      return { seated, onMain, taken, filled: fillLaidFloor(seated, taken, absorbedDemands, appetiteOfRegion) }
    }
    const first = seatAndFill(result.laid)
    if (first === undefined) return { retry: [] }
    const { seated, filled } = first
    if ("placed" in filled) {
      // The walk past the last thing standing on it is cut back, and the cut floor seated and filled again.
      const standing = new Set([...first.taken, ...filled.placed.flatMap(({ cells }) => cells)])
      const trimmed = trimBareTails(plan, lengthPlan, result.laid, seated, standing)
      const again = trimmed === result.laid ? undefined : seatAndFill(trimmed)
      const chosen = again !== undefined && "placed" in again.filled ? again : first
      const placed = "placed" in chosen.filled ? chosen.filled.placed : filled.placed
      const laid = { ...chosen.seated, absorbed: placed, lengthened }
      const answered = answerStubs ? answerBareStubs(plan, laid, absorbedDemands, appetiteOfRegion) : laid
      onLaid?.(answered)
      state.lay = { laid: answered, mainSteps: chosen.onMain }
      return
    }
    // A region laid as a designed room is the room's size, never lengthened.
    const considered = lengtheningCandidates(lengthPlan, seated, filled.missing, appetiteOfRegion).filter(
      candidate => candidate.kind !== "region" || !rooms.has(candidate.id)
    )
    const [cheapest] = considered
    if (cheapest === undefined || lengthened.length >= MAX_LENGTHENINGS)
      return { retry: [{ type: "contentNotLaid", kinds: filled.missing.map(({ kind }) => kind) }] }
    lengthened.push({ kind: cheapest.kind, id: cheapest.id, nodes: cheapest.nodes, considered })
    lengthPlan = lengthenPlan(lengthPlan, seated, cheapest)
  }
})
