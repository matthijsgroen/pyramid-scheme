import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"

// Floors whose grid the assembler derives too small for any `packing` or seed to carve on the first
// attempt (the bake lists them as unsatisfiable); only the ladder's wider grid carves them. Each is
// `journey#level#floor`. A floor leaves this list when it starts carving at attempt 0, and joins it never.
const NEEDS_THE_LADDER = new Set([
  "expert_1#2#0",
  "expert_1#3#0",
  "expert_1#4#0",
  "expert_2#1#0",
  "expert_2#2#0",
  "expert_2#3#0",
  "expert_2#4#0",
  "expert_3#3#0",
  "expert_3#5#0",
  "expert_4#2#0",
  "expert_4#4#0",
  "master_1#1#0",
  "master_1#2#0",
  "master_1#3#0",
  "master_2#3#0",
  "master_3#1#0",
  "master_3#3#0",
  "master_4#1#0",
  "master_4#3#0",
  "wizard_1#1#1",
  "wizard_1#2#1",
  "wizard_1#3#1",
  "wizard_2#2#1",
  "wizard_2#3#1",
  "wizard_3#1#1",
  "wizard_3#2#1",
  "wizard_3#3#1",
  "wizard_4#1#1",
  "wizard_4#2#1",
  "wizard_4#3#1",
  "wizard_4#4#1",
])

const attemptOf = (journeyId: string, levelNr: number, floorIndex: number): number | "failed" => {
  const floor = generatedWorldConfigs[journeyId][levelNr - 1][floorIndex]
  const result = assembleFloor(
    journeyId,
    floor,
    floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex),
    resolveEncounterMeta,
    { resolveKeyRequirements, floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex } }
  )
  return result.success ? result.attempt : "failed"
}

describe("the baked (packing, seed) pair of every shipped floor", () => {
  const floors = Object.entries(generatedWorldConfigs).flatMap(([journeyId, levels]) =>
    levels.flatMap((floorsOfLevel, level) =>
      floorsOfLevel.map((_, floorIndex) => ({
        key: `${journeyId}#${level + 1}#${floorIndex}`,
        journeyId,
        level,
        floorIndex,
      }))
    )
  )

  it("carves every floor, on attempt 0 for all but the floors that need the ladder", () => {
    expect(floors.length).toBeGreaterThan(200)
    const attempts = floors.map(f => [f.key, attemptOf(f.journeyId, f.level + 1, f.floorIndex)] as const)
    expect(
      attempts.filter(([key, attempt]) => attempt === "failed" || (attempt !== 0) !== NEEDS_THE_LADDER.has(key))
    ).toEqual([])
  }, 60000)

  it("lists only floors that exist", () => {
    const keys = new Set(floors.map(f => f.key))
    expect([...NEEDS_THE_LADDER].filter(key => !keys.has(key))).toEqual([])
  })
})
