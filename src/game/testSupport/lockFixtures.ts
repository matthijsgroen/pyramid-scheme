import type { Lock } from "@/game/lockAuthoring"
import { assembleFloor } from "@/game/siteAssembler"
import type { AssemblerReason, FloorGrid } from "@/game/siteTypes"
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

export { sluiceLock }

/** Two arms off a fork in the entrance: a lever in the right arm's end chamber shuts the way back and opens the
 * left arm's chamber, a drop lands on the left arm and another drops home; from the left chamber a drop falls back
 * into the right one, so no chamber is lost. Every region takes `free`. */
export const mirrorForkLock = (): Lock => ({
  name: "mirrorFork",
  regions: {
    in: { takes: "free" },
    leftLower: { takes: "free" },
    rightLower: { takes: "free" },
    s1: { takes: "free" },
    s2: { takes: "free" },
    out: { takes: "free" },
  },
  connections: [
    { between: ["in", "leftLower"], barriers: ["in-leftLower"] },
    { between: ["in", "rightLower"], barriers: ["in-rightLower"] },
    { between: ["rightLower", "s1"], barriers: ["rightLower-s1"] },
    { between: ["leftLower", "s2"], barriers: ["leftLower-s2"] },
    { between: ["in", "out"], barriers: ["in-out"] },
  ],
  gates: {
    "in-leftLower": { from: "in", to: "leftLower", owners: ["Y"] },
    "in-rightLower": { from: "in", to: "rightLower", owners: ["Y"] },
    "rightLower-s1": { from: "rightLower", to: "s1", owners: ["S1"] },
    "leftLower-s2": { from: "leftLower", to: "s2", owners: ["S1"] },
    "in-out": { from: "in", to: "out", owners: ["S2"] },
  },
  oneWays: {
    dropToLeft: { from: "s1", to: "leftLower" },
    dropToIn: { from: "leftLower", to: "in" },
    dropToS1: { from: "s2", to: "s1" },
  },
  mechanics: {
    Y: { control: "fork-switch", in: "in" },
    S1: { control: "toggle", in: "s1", starts: "a", opens: { a: ["rightLower-s1"], b: ["leftLower-s2"] } },
    S2: { control: "toggle", in: "s2", starts: "a", opens: { a: [], b: ["in-out"] } },
  },
  in: "in",
  out: "out",
})

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
