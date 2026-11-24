import { instanceName, type PlacedLock } from "./floorLocks"
import { isRegionGate } from "./lockAuthoring"

/**
 * A LOCK'S LAST DOORS: its gates into its way out, an edge gate with `out` at either end or a region gate on
 * `out`, as the obstacle ids the lock compiles them to (`${instance}.${gate}`).
 */
export const lastDoorsOf = (placed: PlacedLock): string[] => {
  const { gates, out } = placed.lock
  const instance = instanceName(placed)
  return Object.entries(gates)
    .filter(([, gate]) => (isRegionGate(gate) ? gate.region === out : gate.from === out || gate.to === out))
    .map(([id]) => `${instance}.${id}`)
}

/** The instance names of the locks solved now: any of their last doors stands open. */
export const solvedLocks = (locks: readonly PlacedLock[], isOpen: (obstacleId: string) => boolean): Set<string> =>
  new Set(locks.filter(placed => lastDoorsOf(placed).some(isOpen)).map(instanceName))
