/**
 * Every check `yarn lock` and the lock editor print of one lock: whether it compiles, every region is reached and
 * it solves, and what it needs of the build.
 */
import { describeLockWalkFailure, reachableStates, walkLock } from "./lockWalk"
import type { LockSpec } from "./lockWalk"
import { walkSpecOf, needsFace, openAtStart, readable } from "./lockWalkSpec"
import { unreachedRegions } from "./lockReview"
import type { ParsedLock } from "./lockNotation"
import { checkLock, describeLockFault } from "./lockCompile"
import { isWeightOwner, nestSpotBusy, nestSpotOf } from "./lockAuthoring"
import type { Lock } from "./lockAuthoring"

/** The nest spot, or why it is ignored: a spot on a busy connection is no spot, and says so (D9). */
const nestSpotLines = (lock: Lock): string[] => {
  const spot = nestSpotOf(lock)
  if (spot) return [`nest spot: ${spot.from} -&> ${spot.to}`]
  const busy = nestSpotBusy(lock)
  return lock.nestSpot && busy.length > 0
    ? [`nest spot ignored: ${lock.nestSpot.from} -&> ${lock.nestSpot.to} also carries ${busy.join(", ")}`]
    : []
}

/** Where the player stands to work an owner of a gate: a lever's room, a sequence's tiles, a plate's room. A board
 * stands in its own junction beside the ways it opens, so it has no room to come to. */
const controlRegions = (lock: Lock, owner: string): string[] => {
  const plate = lock.weights?.plates[owner]
  if (plate) return [plate.in]
  if (isWeightOwner(lock, owner)) return []
  const m = lock.mechanics[owner]
  if (!m || m.control === "fork-switch") return []
  return m.control === "sequence" ? m.steps.map(step => step.in) : [m.in]
}

/**
 * The gates shut at the start whose door the player cannot reach before their control: from `in`, never entering
 * a region a control of the gate stands in, and never working one, no state stands beside the door. A lesson shows
 * the problem first, so this refuses one; on any other lock it is a warning. `tooLarge` when the lock cannot be walked.
 */
export const doorsSeenLate = (lock: Lock, spec: LockSpec): string[] | "tooLarge" => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return found
  const { order, edges } = found
  const open = new Set(openAtStart(lock))
  return Object.entries(lock.gates)
    .filter(([id, gate]) => !open.has(id) && gate.owners.some(owner => controlRegions(lock, owner).length > 0))
    .flatMap(([id, gate]) => {
      const forbidden = new Set(gate.owners.flatMap(owner => controlRegions(lock, owner)))
      const hops = Object.entries(spec.gates).filter(([hop]) => hop === id || hop.startsWith(`${id}@`))
      const owners = [...new Set(hops.flatMap(([, hop]) => hop.owners))]
      const sides = new Set(hops.flatMap(([, hop]) => [hop.from, hop.to]))
      const untouched = (n: number) => owners.every(owner => order[n].config[owner] === order[0].config[owner])
      if (forbidden.has(order[0].region)) return [id]
      const seen = new Set([0])
      const queue = [0]
      while (queue.length > 0) {
        const at = queue.shift()!
        if (sides.has(order[at].region)) return []
        for (const to of edges[at]) {
          if (seen.has(to) || forbidden.has(order[to].region) || !untouched(to)) continue
          seen.add(to)
          queue.push(to)
        }
      }
      return [id]
    })
}

const doorLines = (late: string[] | "tooLarge", lesson: boolean): string[] => {
  if (late === "tooLarge") return []
  if (late.length === 0) return ["✓ every shut door is seen before its control"]
  return [`${lesson ? "✗" : "⚠"} its control is reached before its door is seen: ${late.join(", ")}`]
}

/** Every check the detail view prints, and whether the lock passes them all. A lesson must also show each shut
 * door before its control. */
export const lockChecks = ({ lock, drafts, refused }: ParsedLock, { lesson = false } = {}) => {
  const spec = walkSpecOf(lock, drafts)
  const walked = walkLock(spec)
  const unreached = unreachedRegions(spec)
  const reachable = Array.isArray(unreached) && unreached.length === 0
  const deadEnd = !walked.sound && walked.failure.type === "strands"
  const lost = !walked.sound && walked.failure.type === "regionLost"
  const open = openAtStart(lock)
  const faults = checkLock(lock)
  const compiles = faults.length === 0
  const late = walked.sound ? doorsSeenLate(lock, spec) : "tooLarge"
  const checks = [
    ...refused.map(problem => `✗ ${problem}`),
    ...(drafts.length > 0 ? [`✗ not placed yet: ${drafts.join(", ")}`] : []),
    compiles ? "✓ compiles" : `✗ refused: ${describeLockFault(faults[0])}`,
    reachable
      ? "✓ every region is reachable"
      : `✗ ${unreached === "tooLarge" ? "too many states to walk" : `never reached: ${unreached.join(", ")}`}`,
    walked.sound || deadEnd || lost
      ? "✓ solvable"
      : `✗ not solvable: ${readable(describeLockWalkFailure(walked.failure))}`,
    ...(deadEnd ? [`✗ a dead end: ${readable(describeLockWalkFailure(walked.failure))}`] : []),
    ...(lost ? [`✗ a region is lost: ${readable(describeLockWalkFailure(walked.failure))}`] : []),
    `at the start ${open.length > 0 ? `these gates stand open: ${open.join(", ")}` : "no gate stands open"}`,
    ...doorLines(late, lesson),
    ...nestSpotLines(lock),
    ...needsFace(lock).map(({ gate, owners }) => `${gate} shows what it waits for: ${owners.join(", ")}`),
  ]
  const sound =
    refused.length === 0 &&
    drafts.length === 0 &&
    compiles &&
    reachable &&
    walked.sound &&
    !(lesson && late !== "tooLarge" && late.length > 0)
  return { spec, walked, checks, sound }
}
