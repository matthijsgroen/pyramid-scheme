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
import { isOutsideInput, isWeightOwner, nestSpotBusy, nestSpotOf } from "./lockAuthoring"
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
 * Where the player first stands beside each gate shut at the start that a control or an outside input owns, or
 * undefined when its door cannot be reached before its control: from `in`, never entering a region a control of the
 * gate stands in, and with none of its owners worked or arrived, no state stands beside the door. Other inputs may
 * arrive on the way. `tooLarge` when the lock cannot be walked.
 */
const doorSightings = (lock: Lock, spec: LockSpec): Map<string, string | undefined> | "tooLarge" => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return found
  const { order, edges } = found
  const open = new Set(openAtStart(lock))
  const sightings = new Map<string, string | undefined>()
  for (const [id, gate] of Object.entries(lock.gates)) {
    if (open.has(id)) continue
    if (!gate.owners.some(owner => controlRegions(lock, owner).length > 0 || isOutsideInput(lock, owner))) continue
    const forbidden = new Set(gate.owners.flatMap(owner => controlRegions(lock, owner)))
    const hops = Object.entries(spec.gates).filter(([hop]) => hop === id || hop.startsWith(`${id}@`))
    const owners = [...new Set(hops.flatMap(([, hop]) => hop.owners))]
    const sides = new Set(hops.flatMap(([, hop]) => [hop.from, hop.to]))
    const untouched = (n: number) => owners.every(owner => order[n].config[owner] === order[0].config[owner])
    let seenAt: string | undefined
    const seen = new Set([0])
    const queue = forbidden.has(order[0].region) ? [] : [0]
    while (queue.length > 0 && seenAt === undefined) {
      const at = queue.shift()!
      if (sides.has(order[at].region)) seenAt = order[at].region
      for (const to of edges[at]) {
        if (seen.has(to) || forbidden.has(order[to].region) || !untouched(to)) continue
        seen.add(to)
        queue.push(to)
      }
    }
    sightings.set(id, seenAt)
  }
  return sightings
}

/**
 * The gates shut at the start whose door the player cannot reach before their control (`doorSightings`). A lesson
 * shows the problem first, so this refuses one; on any other lock it is a warning. `tooLarge` when the lock cannot
 * be walked.
 */
export const doorsSeenLate = (lock: Lock, spec: LockSpec): string[] | "tooLarge" => {
  const sightings = doorSightings(lock, spec)
  if (sightings === "tooLarge") return sightings
  return [...sightings].flatMap(([id, at]) => (at === undefined ? [id] : []))
}

const doorLines = (lock: Lock, sightings: Map<string, string | undefined> | "tooLarge", lesson: boolean): string[] => {
  if (sightings === "tooLarge") return []
  const inputs = lock.inputs ?? []
  const late = [...sightings].flatMap(([id, at]) => (at === undefined ? [id] : []))
  if (late.length === 0) {
    // Each input by the first of its doors in the order written.
    const seen = inputs.flatMap(input => {
      const door = [...sightings].find(([id]) => lock.gates[id].owners.includes(input))
      return door ? [`${input} at ${readable(door[1]!)}`] : []
    })
    return [`✓ every shut door is seen before its control${seen.length > 0 ? `: ${seen.join(", ")}` : ""}`]
  }
  const mark = lesson ? "✗" : "⚠"
  // A door only inputs own has no control on the floor: it is late when it is reached only once they arrive.
  const onlyInputs = (id: string) => lock.gates[id].owners.every(owner => isOutsideInput(lock, owner))
  const controlled = late.filter(id => !onlyInputs(id))
  const waiting = [
    ...new Set(
      late.filter(onlyInputs).map(id => {
        const { owners, mode } = lock.gates[id]
        const held = owners.join(mode === "any" ? " or " : " and ")
        return `${mark} ${owners.join(", ")}: its door is reached only once ${held} ${owners.length > 1 && mode !== "any" ? "are" : "is"} held`
      })
    ),
  ]
  return [
    ...(controlled.length > 0
      ? [`${mark} its control is reached before its door is seen: ${controlled.join(", ")}`]
      : []),
    ...waiting,
  ]
}

/** The outside inputs, which may arrive in any order: the walk holds every order. */
const inputLines = (lock: Lock): string[] =>
  (lock.inputs ?? []).length > 0 ? [`inputs: ${lock.inputs!.join(", ")}, arriving in any order`] : []

/** The lock's pipe, by the regions its holes join. */
const pipeLines = (lock: Lock): string[] =>
  Object.entries(lock.weights?.pipes ?? {}).map(([id, { ends }]) => `pipe ${id}: ${ends[0]} ⇄ ${ends[1]}`)

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
  const sightings = walked.sound ? doorSightings(lock, spec) : "tooLarge"
  const late = sightings === "tooLarge" ? sightings : [...sightings.values()].filter(at => at === undefined)
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
    ...inputLines(lock),
    `at the start ${open.length > 0 ? `these gates stand open: ${open.join(", ")}` : "no gate stands open"}`,
    ...doorLines(lock, sightings, lesson),
    ...nestSpotLines(lock),
    ...pipeLines(lock),
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
