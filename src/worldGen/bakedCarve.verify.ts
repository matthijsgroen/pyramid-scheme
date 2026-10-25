import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { refusal } from "./carveSeedSearch"

/** What the runtime carves a shipped floor to, ladder and all, judged on every hard criterion. */
const refusalOf = (journeyId: string, levelNr: number, floorIndex: number) => {
  const floor = generatedWorldConfigs[journeyId][levelNr - 1][floorIndex]
  const result = assembleFloor(
    journeyId,
    floor,
    floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex),
    resolveEncounterMeta,
    { resolveKeyRequirements, floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex } }
  )
  return refusal(result, floor)
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

  it("carves every floor as the runtime does, meeting every hard criterion", () => {
    expect(floors.length).toBeGreaterThan(200)
    const refused = floors.flatMap(f => {
      const found = refusalOf(f.journeyId, f.level + 1, f.floorIndex)
      return found ? [`${f.key}: ${found.criterion} — ${found.detail}`] : []
    })
    expect(refused).toEqual([])
  }, 120000)
})
