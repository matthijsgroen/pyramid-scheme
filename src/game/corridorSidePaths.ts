import type { LockPlan, PlanCorridor } from "./lockPlan"
import { appetiteAccepts } from "./regions"
import type { ContentKind, RegionAppetite } from "./regions"

/**
 * WHICH LOCK CORRIDORS CARRY A FLOOR'S SIDE PATHS. Only an open side path goes into a lock: a key or a detector
 * inside one would make the lock not provably solvable, because the walk through it would then depend on what
 * the player carries. A trapped side path may go in, because a trap costs only hearts and the camp always heals.
 */

/** A side section and the lock corridor (`PlanCorridor.id`) its rooms stand on. */
export type CorridorAssignment = { section: number; corridor: string }

const ALL_KINDS: readonly ContentKind[] = ["puzzle", "reward"]

const appetiteOf = (appetite: ReadonlyMap<string, RegionAppetite>, region: string): RegionAppetite =>
  appetite.get(region) ?? "free"

const takes = (appetite: ReadonlyMap<string, RegionAppetite>, corridor: PlanCorridor, kind: ContentKind): boolean =>
  appetiteAccepts(appetiteOf(appetite, corridor.from), kind) || appetiteAccepts(appetiteOf(appetite, corridor.to), kind)

/**
 * The corridors a side path may stand on, off-route ones first, then on-route ones, each in plan order. Never one
 * carrying a drop's stretch, a fork-switch junction's arm, one arriving in a sequence step's region (its nodes
 * stay bare for the step's tile), one joining a nested lock into its host's nest spot, or one between regions
 * that take no room.
 */
export const eligibleCorridors = (plan: LockPlan, appetite: ReadonlyMap<string, RegionAppetite>): PlanCorridor[] => {
  const holdsStep = new Set(
    plan.regions.filter(region => region.seats.some(seat => seat.for === "threshold")).map(region => region.id)
  )
  const dropStretch = new Set(plan.regions.filter(region => region.answersTo !== undefined).map(region => region.id))
  const arms = new Set(plan.junctions.flatMap(junction => junction.arms))
  const ownerOf = new Map(plan.regions.map(region => [region.id, region.owner]))
  const splices = (corridor: PlanCorridor) =>
    plan.nested.some(({ between, instance }) =>
      [
        [corridor.from, corridor.to],
        [corridor.to, corridor.from],
      ].some(([spot, other]) => between.includes(spot) && (ownerOf.get(other) === instance || between.includes(other)))
    )
  const eligible = plan.corridors.filter(
    corridor =>
      !dropStretch.has(corridor.from) &&
      !dropStretch.has(corridor.to) &&
      !arms.has(corridor.id) &&
      !holdsStep.has(corridor.from) &&
      !holdsStep.has(corridor.to) &&
      !splices(corridor) &&
      ALL_KINDS.some(kind => takes(appetite, corridor, kind))
  )
  return [...eligible.filter(corridor => !corridor.onRoute), ...eligible.filter(corridor => corridor.onRoute)]
}

/**
 * PAIRS SIDE SECTIONS WITH CORRIDORS, in authored section order onto the corridors' order: each section takes the
 * first corridor holding the fewest sections among those whose end regions take every kind of room it has, so a
 * corridor takes a second section only once every corridor that would take it holds one. A section no corridor
 * takes is left out, and hangs as a branch.
 */
export const assignCorridors = (
  corridors: readonly PlanCorridor[],
  sections: readonly { section: number; kinds: readonly ContentKind[] }[],
  appetite: ReadonlyMap<string, RegionAppetite>
): CorridorAssignment[] => {
  const load = corridors.map(() => 0)
  return sections.flatMap(({ section, kinds }) => {
    let best = -1
    corridors.forEach((corridor, i) => {
      if (!kinds.every(kind => takes(appetite, corridor, kind))) return
      if (best < 0 || load[i] < load[best]) best = i
    })
    if (best < 0) return []
    load[best]++
    return [{ section, corridor: corridors[best].id }]
  })
}
