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
  flame: ["torch"],
  sequence: ["pressure-plate"],
  "fork-switch": ["lightbeamSwitch"],
  "one-way": ["zipline"],
  "region-barrier": ["water", "sand"],
  weights: ["stonePlate"],
  unladen: ["narrowPassage"],
}

export const defaultBinding = (): Record<string, string> =>
  Object.fromEntries(Object.entries(REALISATION_CHOICES).map(([kind, [first]]) => [kind, first]))

/** The lock alone on an expert floor with no puzzles, every region free, as the dev floors bench a lock; `nest` is
 * spliced into its nest spot. A lock with no spot is placed with `nest` anyway, so the floor refuses it by name
 * (`noNestSpot`). */
export const playgroundFloor = (lock: Lock, binding: RealisationBinding, nest?: Lock): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [
    { lock: freeRegions(lock) },
    ...(nest ? [{ lock: freeRegions(nest), as: "inner", inside: { instance: lock.name } }] : []),
  ],
  realisations: binding,
})

/** How many seeds the search tries before it reports a refusal. */
export const CARVE_BUDGET = 200

export type CarveStep =
  | { status: "found"; seed: number; grid: FloorGrid }
  | { status: "carving"; tried: number; reasons: AssemblerReason[] }
  | { status: "refused"; reasons: AssemblerReason[] }

/** One seed of the search for the floor play carves: the one place a seed is judged, so the story (one seed per
 * task) and the specs (the whole search) cannot pick different seeds. `reasons` is the first refusal so far. */
export const carveStep = (config: FloorConfig, seed: number, reasons: AssemblerReason[] = []): CarveStep => {
  const result = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, seed, 0)
  if (result.success) return { status: "found", seed, grid: result.grid }
  const first = reasons.length > 0 ? reasons : result.reasons
  return seed + 1 >= CARVE_BUDGET
    ? { status: "refused", reasons: first }
    : { status: "carving", tried: seed + 1, reasons: first }
}

/** The first seed below `CARVE_BUDGET` that play carves the floor at, with the grid it carves; otherwise the first
 * refusal, so the playground can say why. */
export const carvePlayground = (
  config: FloorConfig
): { found: true; seed: number; grid: FloorGrid } | { found: false; reasons: AssemblerReason[] } => {
  let step: CarveStep = { status: "carving", tried: 0, reasons: [] }
  for (let seed = 0; step.status === "carving"; seed++) step = carveStep(config, seed, step.reasons)
  return step.status === "found"
    ? { found: true, seed: step.seed, grid: step.grid }
    : { found: false, reasons: step.reasons }
}
