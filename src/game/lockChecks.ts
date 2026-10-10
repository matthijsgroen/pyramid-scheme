/**
 * Every check `yarn lock` and the lock editor print of one lock: whether it compiles, every region is reached and
 * it solves, and what it needs of the build.
 */
import { describeLockWalkFailure, walkLock } from "./lockWalk"
import { walkSpecOf, needsFace, openAtStart, readable } from "./lockWalkSpec"
import { unreachedRegions } from "./lockReview"
import type { ParsedLock } from "./lockNotation"
import { checkLock, describeLockFault } from "./lockCompile"
import { nestSpotBusy, nestSpotOf } from "./lockAuthoring"
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

/** Every check the detail view prints, and whether the lock passes them all. */
export const lockChecks = ({ lock, drafts, refused }: ParsedLock) => {
  const spec = walkSpecOf(lock, drafts)
  const walked = walkLock(spec)
  const unreached = unreachedRegions(spec)
  const reachable = Array.isArray(unreached) && unreached.length === 0
  const deadEnd = !walked.sound && walked.failure.type === "strands"
  const lost = !walked.sound && walked.failure.type === "regionLost"
  const open = openAtStart(lock)
  const faults = checkLock(lock)
  const compiles = faults.length === 0
  const sequences = Object.entries(lock.mechanics).flatMap(([id, m]) => (m.control === "sequence" ? [id] : []))
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
    ...nestSpotLines(lock),
    ...needsFace(lock).map(({ gate, owners }) => `${gate} shows what it waits for: ${owners.join(", ")}`),
    ...sequences.map(id => `⚠ sequence ${id}: its tiles may stand in any region — contract §8 open`),
  ]
  const sound = refused.length === 0 && drafts.length === 0 && compiles && reachable && walked.sound
  return { spec, walked, checks, sound }
}
