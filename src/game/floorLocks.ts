import type { Lock } from "./lockAuthoring"
import { compileLock } from "./lockCompile"
import type { LockFragment, RealisationBinding } from "./lockCompile"
import type { Region } from "./regions"
import type { AssemblerReason, FloorConfig } from "./siteTypes"

/**
 * A LOCK PLACED ON A FLOOR. `lock` is shared by reference between every floor that uses it; `as` names this
 * instance, defaulting to the lock's own name. Two placements of one lock on a floor are two instances, so the
 * second must say `as`.
 */
export type PlacedLock = { lock: Lock; as?: string }

/** The floor's own ground before its first lock and after its last. Belongs to no lock, so the exit is outside every one. */
export const FLOOR_ENTRANCE = "entrance"
export const FLOOR_EXIT = "exit"

/** The fields a floor's locks compile into; authoring any of them beside `locks` would be two statements of one thing. */
const COMPILED_FIELDS = ["regionLayout", "obstacles", "controls", "barrierOrder", "oneWayRealisation"] as const

const contradictions = (config: FloorConfig): string[] => [
  ...COMPILED_FIELDS.filter(field => config[field] !== undefined),
  ...((config.forks ?? []).some(fork => "in" in fork) ? ["forks"] : []),
]

const instanceName = (placed: PlacedLock): string => placed.as ?? placed.lock.name

/**
 * THE FLOOR'S LOCKS COMPILED INTO ITS OWN VOCABULARY, or every reason they cannot be. The one place a floor's
 * `locks` and its `realisations` binding are read; the carve sees only what comes out, so a floor with locks
 * and the same floor written longhand carve alike.
 *
 * The layout is ONE container whose regions are the floor's entrance, each lock's regions in sequence, and the
 * floor's exit: `entrance -> lock1.in ... lock1.out -> lock2.in ... lock2.out -> exit`. `Placement` seats a
 * single container on a stretch of the main path and leaves the rest unlabelled; two locks in sequence need
 * the stretch between them to be a region of its own, so the sequence is composed directly instead.
 */
export const expandFloorLocks = (
  config: FloorConfig
): { ok: true; config: FloorConfig } | { ok: false; reasons: AssemblerReason[] } => {
  const placements = config.locks ?? []
  if (placements.length === 0) return { ok: true, config }

  const clashing = contradictions(config)
  if (clashing.length > 0) return { ok: false, reasons: [{ type: "locksContradictFloor", fields: clashing }] }

  const reasons: AssemblerReason[] = []
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const placed of placements) {
    const name = instanceName(placed)
    if (seen.has(name)) repeated.add(name)
    seen.add(name)
  }
  for (const instance of repeated) reasons.push({ type: "lockInstanceRepeated", instance })

  const binding: RealisationBinding = config.realisations ?? {}
  const fragments: LockFragment[] = []
  for (const placed of placements) {
    const instance = instanceName(placed)
    const result = compileLock(placed.lock, binding, { namespace: instance })
    if (result.ok) fragments.push(result.fragment)
    else for (const fault of result.faults) reasons.push({ type: "lockRefused", instance, fault })
  }
  if (reasons.length > 0) return { ok: false, reasons }

  const layouts = fragments.map(fragment => fragment.regionLayout)
  const ground = (name: string): Region => ({ name, appetite: "free" })
  const joins: Array<readonly [string, string]> = [
    [FLOOR_ENTRANCE, layouts[0].in],
    ...layouts.flatMap((layout, i) => [
      ...layout.connections,
      ...(i + 1 < layouts.length ? [[layout.out, layouts[i + 1].in] as const] : []),
    ]),
    [layouts[layouts.length - 1].out, FLOOR_EXIT],
  ]

  const { locks: _locks, realisations: _realisations, ...floor } = config
  const forks = [...(config.forks ?? []), ...fragments.flatMap(fragment => fragment.forks)]
  const barrierOrder = fragments.flatMap(fragment => fragment.barrierOrder)
  const oneWayRealisation = fragments.find(fragment => fragment.oneWayRealisation)?.oneWayRealisation
  return {
    ok: true,
    config: {
      ...floor,
      regionLayout: {
        regions: [ground(FLOOR_ENTRANCE), ...layouts.flatMap(layout => layout.regions), ground(FLOOR_EXIT)],
        connections: joins,
        in: FLOOR_ENTRANCE,
        out: FLOOR_EXIT,
      },
      obstacles: fragments.flatMap(fragment => fragment.obstacles),
      controls: fragments.flatMap(fragment => fragment.controls),
      ...(forks.length > 0 ? { forks } : {}),
      ...(barrierOrder.length > 0 ? { barrierOrder } : {}),
      ...(oneWayRealisation === undefined ? {} : { oneWayRealisation }),
    },
  }
}
