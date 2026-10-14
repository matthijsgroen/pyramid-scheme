import { forkPositions, freeWaysOut, keyOf, nodeExitsOf, rooms, routeStepOf } from "./derive"
import type { Pass } from "./state"

/**
 * WHICH JUNCTIONS THIS CARVE HOLDS FOR `forks`, in the order anything will fill them. Read off the carve and the
 * rooms already on it, never off `switches` — which is what makes this attempt kept or rejected for the same
 * reason whether or not a mod is here to fill them.
 *
 * The narrowest junction that still answers each demand, widest demand first, so a wide demand is never left
 * with a junction too narrow for it. Two reserved junctions never share a way out: one boundary closed twice is
 * two doors in one doorway.
 *
 * A `{ in }` FORK'S JUNCTION IS THE ONE LAID FOR IT, and is held out of the rest: it is proven to exit by exactly
 * its seams — every way out of it that is not the main path is the first cell of a chain it was laid for — and a
 * junction that does not is this attempt's shortfall, never a junction elsewhere. Read off the carve's geometry,
 * not its rooms: a gate standing on a seam is a room, and the mod being off must not change which ways out the
 * junction has.
 *
 * A junction short is an authored feature this carve cannot hold, so another carve is taken; the shortfall
 * names how many junctions came close, and the loop keeps the attempt that came closest.
 *
 * HOW MANY OF THE RESERVED JUNCTIONS END UP WITH A SWITCH IN THEM is settled here too, which is also how many of
 * them keep their doors closed: a drop may not land behind a door one of them is going to mint.
 */
export const reserveJunctions: Pass<
  "maze" | "junctions" | "keys" | "labels" | "lay" | "branches" | "doors" | "mainRooms" | "chainRooms",
  "forks"
> = (prep, state) => {
  const { forkIns, forkDemands } = prep.forks
  const { mainPath } = state.maze
  const laid = state.lay?.laid
  const stepOf = routeStepOf(state.maze)
  const roomAt = rooms(state)
  const exitsOf = nodeExitsOf(state)
  const waysOut = freeWaysOut(state)
  const positions = forkPositions(state)
  const isFork = (pk: string) => roomAt.get(pk)?.roomType === "fork"

  const inFork = new Set<string>()
  const claimedWaysOut = new Set<string>()
  for (const [k, fork] of forkIns.entries()) {
    const junctionIndex = state.junctions.order[k]
    const pk = keyOf(mainPath[junctionIndex])
    // An arm on the main path is the route's way on, which leaves by the next step.
    const onward = laid?.junctions[k].arms.filter(arm => stepOf.has(arm.first)) ?? []
    const wanted = new Set(
      laid
        ? laid.junctions[k].arms.filter(arm => !stepOf.has(arm.first)).map(arm => arm.first)
        : fork.sectionIdxs.map(si =>
            keyOf(state.keys.chains.find(chain => chain.parentIdx === undefined && chain.idx === si)!.cells[0])
          )
    )
    const sideWays = exitsOf(pk)
      .map(({ neighborKey }) => neighborKey)
      .filter(neighborKey => {
        const neighborIndex = stepOf.get(neighborKey)
        return neighborIndex === undefined || Math.abs(neighborIndex - junctionIndex) !== 1
      })
    const exact =
      isFork(pk) &&
      onward.every(arm => stepOf.get(arm.first) === junctionIndex + 1) &&
      sideWays.length === wanted.size &&
      sideWays.every(neighborKey => wanted.has(neighborKey))
    if (!exact) return { retry: [{ type: "forkSeamsNotLaid", fork }] }
    inFork.add(pk)
    for (const neighborKey of sideWays) claimedWaysOut.add(neighborKey)
  }

  const reserved: string[] = []
  for (const exits of forkDemands) {
    const pick = [...positions]
      .filter(pk => !inFork.has(pk) && !reserved.includes(pk) && isFork(pk))
      .map(pk => ({ pk, ways: waysOut(pk).filter(({ neighborKey }) => !claimedWaysOut.has(neighborKey)) }))
      .filter(({ ways }) => ways.length >= exits)
      .sort((a, b) => a.ways.length - b.ways.length)[0]
    if (pick === undefined) {
      const carved = [...positions].filter(pk => !inFork.has(pk) && isFork(pk) && waysOut(pk).length >= exits).length
      const count = forkDemands.filter(demand => demand >= exits).length
      return { retry: [{ type: "forksUnsatisfied", exits, count, carved }] }
    }
    reserved.push(pick.pk)
    for (const { neighborKey } of pick.ways) claimedWaysOut.add(neighborKey)
  }

  const { switches } = prep.config.config
  state.forks = { reserved, inFork, switchesPlaced: switches ? Math.min(switches.max, reserved.length) : 0 }
}
