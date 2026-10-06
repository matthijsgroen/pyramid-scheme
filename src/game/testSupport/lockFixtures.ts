import type { Lock } from "@/game/lockAuthoring"
import { assembleFloor } from "@/game/siteAssembler"
import type { AssemblerReason, FloorGrid } from "@/game/siteTypes"
import { doubleBackLock } from "@/worldGen/spec/locks/doubleBack"
import { sluiceLock } from "@/worldGen/spec/locks/sluice"
import type { RealisationBinding } from "@/game/lockCompile"

export const BINDING: RealisationBinding = {
  toggle: "handle",
  activator: "torch",
  sequence: "plates",
  "fork-switch": "lightbeamSwitch",
  "one-way": "zipline",
  "region-barrier": "water",
}

export { doubleBackLock, sluiceLock }

/** A lock placed alone on a floor with no content of its own, carved at the first of `seeds` that carves it. */
export const carveLockFloor = (
  lock: Lock,
  binding: RealisationBinding,
  seeds: readonly number[] = Array.from({ length: 12 }, (_, n) => (n + 1) * 7919)
): FloorGrid => {
  const refused: AssemblerReason[][] = []
  for (const seed of seeds) {
    const result = assembleFloor(
      "test",
      {
        pathPuzzles: 0,
        difficulty: "expert",
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [],
        locks: [{ lock }],
        realisations: binding,
      },
      seed
    )
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`${lock.name} carved at none of ${seeds.length} seeds: ${JSON.stringify(refused[0])}`)
}
