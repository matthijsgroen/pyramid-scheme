/**
 * What `yarn lock` checks of one lock, and the catalogue as one table built from those checks: a row per lock
 * saying what it is made of, how long its shortest solution is, and the first check it fails.
 */
import { describeLockWalkFailure, walkLock } from "../src/game/lockWalk"
import { walkSpecOf, needsFace, notBuildable, openAtStart, readable } from "../src/game/lockWalkSpec"
import { solveLock, unreachedRegions } from "../src/game/lockReview"
import type { ParsedLock } from "../src/game/lockNotation"
import { isRegionGate, isUnladenGate, nestSpotBusy, nestSpotOf } from "../src/game/lockAuthoring"
import type { Lock, LockMechanic } from "../src/game/lockAuthoring"

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
  const open = openAtStart(lock)
  const unbuilt = notBuildable(lock)
  const sequences = Object.entries(lock.mechanics).flatMap(([id, m]) => (m.control === "sequence" ? [id] : []))
  const checks = [
    ...refused.map(problem => `✗ ${problem}`),
    ...(drafts.length > 0 ? [`✗ not placed yet: ${drafts.join(", ")}`] : []),
    reachable
      ? "✓ every region is reachable"
      : `✗ ${unreached === "tooLarge" ? "too many states to walk" : `never reached: ${unreached.join(", ")}`}`,
    walked.sound || deadEnd ? "✓ solvable" : `✗ not solvable: ${readable(describeLockWalkFailure(walked.failure))}`,
    ...(deadEnd ? [`✗ a dead end: ${readable(describeLockWalkFailure(walked.failure))}`] : []),
    `at the start ${open.length > 0 ? `these gates stand open: ${open.join(", ")}` : "no gate stands open"}`,
    ...nestSpotLines(lock),
    ...needsFace(lock).map(({ gate, owners }) => `${gate} shows what it waits for: ${owners.join(", ")}`),
    ...sequences.map(id => `⚠ sequence ${id}: done stays fired, tiles anywhere — contract §8 open`),
    ...(unbuilt.length > 0 ? [`⚠ not buildable yet: ${unbuilt.join(", ")}`] : []),
  ]
  const sound = refused.length === 0 && drafts.length === 0 && reachable && walked.sound
  return { spec, walked, checks, sound }
}

const CONTROL_WORDS: Record<LockMechanic["control"], string> = {
  toggle: "lever",
  flame: "torch",
  activator: "activator",
  sequence: "sequence",
  "fork-switch": "fork",
}
const MECHANISM_ORDER = [
  "lever",
  "torch",
  "activator",
  "sequence",
  "fork",
  "stones",
  "narrow passage",
  "water/sand",
  "drop",
]

/** The kinds of mechanism a lock is built from, in the author's words, each once. */
export const mechanismsOf = (lock: Lock): string[] => {
  const used = new Set([
    ...Object.values(lock.mechanics).map(m => CONTROL_WORDS[m.control]),
    ...(Object.keys(lock.weights?.plates ?? {}).length > 0 ? ["stones"] : []),
    ...Object.values(lock.gates).flatMap(gate =>
      isRegionGate(gate) ? ["water/sand"] : isUnladenGate(gate) ? ["narrow passage"] : []
    ),
    ...(Object.keys(lock.oneWays ?? {}).length > 0 ? ["drop"] : []),
  ])
  return MECHANISM_ORDER.filter(word => used.has(word))
}

export type LockRow = { lock: string; mechanisms: string; steps: string; checks: string; sound: boolean }

/** One table row: `path` is the name `yarn lock <name>` takes. */
export const lockRow = (path: string, parsed: ParsedLock): LockRow => {
  const { spec, checks, sound } = lockChecks(parsed)
  const solved = solveLock(spec)
  const failed = checks.find(check => check.startsWith("✗"))
  return {
    lock: path,
    mechanisms: mechanismsOf(parsed.lock).join(", "),
    steps: solved ? String(solved.actions) : "–",
    checks: sound ? "✓" : (failed ?? "✗"),
    sound,
  }
}

/** The rows as a table, sorted by path, with a header. */
export const formatLockTable = (rows: readonly LockRow[]): string => {
  const sorted = [...rows].sort((a, b) => a.lock.localeCompare(b.lock))
  const lockWidth = Math.max(4, ...sorted.map(row => row.lock.length))
  const mechWidth = Math.max(10, ...sorted.map(row => row.mechanisms.length))
  const line = (lock: string, mechanisms: string, steps: string, checks: string) =>
    `${lock.padEnd(lockWidth)}  ${mechanisms.padEnd(mechWidth)}  ${steps.padStart(5)}  ${checks}`.trimEnd()
  return [
    line("lock", "mechanisms", "steps", "checks"),
    ...sorted.map(row => line(row.lock, row.mechanisms, row.steps, row.checks)),
  ].join("\n")
}
