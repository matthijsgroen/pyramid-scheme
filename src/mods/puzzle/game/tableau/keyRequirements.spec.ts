import { describe, expect, it } from "vitest"
import { tableauLevels } from "@/data/tableaus"
import { resolveTableauKeyRequirements } from "./keyRequirements"

// Real consumers (TombExpedition.tsx, TableauInventory.tsx) select a run's tableaus by
// tombJourneyId + runNumber, then index by floor (levelNr - 1 via array position) — e.g.
// `runTableaus[floor]` where `runTableaus = tableaux.filter(t => t.runNumber === n)`. This
// mirrors that exact lookup, independently of resolveTableauKeyRequirements's own
// implementation.
const realTableau = (journeyId: string, runNr: number, levelNr: number) =>
  tableauLevels.find(t => t.tombJourneyId === journeyId && t.runNumber === runNr && t.levelNr === levelNr)

describe(resolveTableauKeyRequirements, () => {
  it("pathIndex selects levelNr (pathIndex + 1), independent of runNr", () => {
    const tombId = "starter_treasure_tomb"
    const levelCount = tableauLevels.filter(t => t.tombJourneyId === tombId && t.runNumber === 1).length
    expect(levelCount).toBeGreaterThan(1) // otherwise this test can't distinguish pathIndex at all

    for (let pathIndex = 0; pathIndex < levelCount; pathIndex++) {
      const expected = realTableau(tombId, 1, pathIndex + 1)!
      expect(resolveTableauKeyRequirements(tombId, 0, pathIndex, { runNr: 1 })).toEqual(
        expected.inventoryIds.map(id => `hieroglyph:${id}`)
      )
    }
  })

  it("runNr selects which treasure's tableau, independent of floorIndex", () => {
    const tombId = "starter_treasure_tomb"
    const run1 = resolveTableauKeyRequirements(tombId, 0, 0, { runNr: 1 })
    const run2 = resolveTableauKeyRequirements(tombId, 0, 0, { runNr: 2 })
    expect(run2).not.toEqual(run1)
  })

  it("floorIndex doesn't affect the result — runNr/pathIndex fully determine the lookup", () => {
    const tombId = "starter_treasure_tomb"
    const a = resolveTableauKeyRequirements(tombId, 0, 0, { runNr: 1 })
    const b = resolveTableauKeyRequirements(tombId, 99, 0, { runNr: 1 })
    expect(a).toEqual(b)
  })

  it("throws when encounterArgs is missing or malformed", () => {
    const tombId = "starter_treasure_tomb"
    expect(() => resolveTableauKeyRequirements(tombId, 0, 0, undefined)).toThrow()
    expect(() => resolveTableauKeyRequirements(tombId, 0, 0, {})).toThrow()
    expect(() => resolveTableauKeyRequirements(tombId, 0, 0, { runNr: -1 })).toThrow()
    expect(() => resolveTableauKeyRequirements(tombId, 0, 0, { runNr: "1" })).toThrow()
  })

  it("throws for a (journey, runNr, levelNr) combination with no matching tableau level", () => {
    expect(() => resolveTableauKeyRequirements("starter_treasure_tomb", 0, 999, { runNr: 1 })).toThrow()
    expect(() => resolveTableauKeyRequirements("not-a-real-tomb", 0, 0, { runNr: 1 })).toThrow()
  })
})
