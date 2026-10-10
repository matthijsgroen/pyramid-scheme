/**
 * What `yarn lock` checks of one lock, and the catalogue as one table built from those checks: a row per lock
 * saying what it is made of, how long its shortest solution is, and the first check it fails.
 */
import { solveLock } from "../src/game/lockReview"
import type { ParsedLock } from "../src/game/lockNotation"
import { lockChecks } from "../src/game/lockChecks"
import { corridorLine } from "../src/game/lockNotation"
import { alignOf, barriersOf, isRegionGate, isUnladenGate, joinOf } from "../src/game/lockAuthoring"
import type { Lock, LockMechanic } from "../src/game/lockAuthoring"

export { lockChecks }

/** Every corridor worth writing back: one with several items, an aligned gate, or a pair it shares. */
export const corridorLines = (lock: Lock): string[] => {
  const pairKey = (connection: Lock["connections"][number]) => [...joinOf(connection)].sort().join("|")
  const perPair = new Map<string, number>()
  for (const connection of lock.connections)
    perPair.set(pairKey(connection), (perPair.get(pairKey(connection)) ?? 0) + 1)
  return lock.connections
    .filter(
      connection =>
        barriersOf(connection).length > 1 ||
        Object.keys(alignOf(connection)).length > 0 ||
        (perPair.get(pairKey(connection)) ?? 0) > 1
    )
    .map(connection => corridorLine(lock, connection))
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
