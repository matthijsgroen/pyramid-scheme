import { journeys as allKnownJourneys } from "@/data/journeys"
import { freeRegions, type Lock } from "@/game/lockAuthoring"
import type { RealisationBinding } from "@/game/lockCompile"
import type { AssemblerReason, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assemblePlayedFloor } from "./useAssembledFloor"

// A LOCK STANDING ALONE ON A FLOOR, carved and played the way the game plays it. Used by the Lock playground story
// and by the specs that play a lock through the real navigation.

/** A known journey, because the journeys API files a level's writes only under one it knows. */
export const PLAYGROUND_JOURNEY = allKnownJourneys[0].id

/** Every realisation a control kind can be dressed as, first the default. A kind the lock does not use is ignored
 * by `compileLock`, so one binding serves every lock. */
export const REALISATION_CHOICES: Readonly<Record<string, readonly string[]>> = {
  toggle: ["handle"],
  activator: ["torch"],
  sequence: ["pressure-plate"],
  "fork-switch": ["lightbeamSwitch"],
  "one-way": ["zipline"],
  "region-barrier": ["water", "sand"],
  weights: ["stonePlate"],
}

export const defaultBinding = (): Record<string, string> =>
  Object.fromEntries(Object.entries(REALISATION_CHOICES).map(([kind, [first]]) => [kind, first]))

/** The lock alone on an expert floor with no puzzles, every region free, as the dev floors bench a lock. */
export const playgroundFloor = (lock: Lock, binding: RealisationBinding): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: freeRegions(lock) }],
  realisations: binding,
})

/** How many seeds the search tries before it reports a refusal. */
export const CARVE_BUDGET = 200

/** The first seed below `budget` that play carves the floor at, with the grid it carves; otherwise the first
 * refusal, so the playground can say why. */
export const carvePlayground = (
  config: FloorConfig,
  budget = CARVE_BUDGET
): { found: true; seed: number; grid: FloorGrid } | { found: false; reasons: AssemblerReason[] } => {
  let reasons: AssemblerReason[] = []
  for (let seed = 0; seed < budget; seed++) {
    const result = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, seed, 0)
    if (result.success) return { found: true, seed, grid: result.grid }
    if (reasons.length === 0) reasons = result.reasons
  }
  return { found: false, reasons }
}
