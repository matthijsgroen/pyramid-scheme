import { describe, expect, it } from "vitest"
import { tableauLevels } from "@/data/tableaus"
import { resolveTableauKeyRequirements } from "./keyRequirements"

// The real consumers (TombExpedition.tsx, TableauInventory.tsx) select run-1's tableaus by
// tombJourneyId + runNumber, then index the resulting array by floor (levelNr - 1 via array
// position) — e.g. TombExpedition.tsx: `runTableaus[floor]` where
// `runTableaus = tableaux.filter(t => t.runNumber === completionCount + 1)`. This mirrors
// that exact lookup, independently of resolveTableauKeyRequirements's own implementation, so
// a regression that inverts runNumber/levelNr (as happened once already) fails here.
const realFloorTableau = (journeyId: string, floorIndex: number) =>
  tableauLevels.filter(t => t.tombJourneyId === journeyId && t.runNumber === 1)[floorIndex]

describe(resolveTableauKeyRequirements, () => {
  it("resolves every floor of a multi-floor tomb to that SPECIFIC floor's own hieroglyphs, not floor 0's", () => {
    const tombId = "starter_treasure_tomb"
    const floorCount = tableauLevels.filter(t => t.tombJourneyId === tombId && t.runNumber === 1).length
    expect(floorCount).toBeGreaterThan(1) // otherwise this test can't distinguish floors at all

    for (let floorIndex = 0; floorIndex < floorCount; floorIndex++) {
      const expected = realFloorTableau(tombId, floorIndex)
      expect(resolveTableauKeyRequirements(tombId, floorIndex, 0)).toEqual(
        expected.inventoryIds.map(id => `hieroglyph:${id}`)
      )
    }
  })

  it("different floors of the same tomb require different hieroglyphs", () => {
    const floor0 = resolveTableauKeyRequirements("starter_treasure_tomb", 0, 0)
    const floor1 = resolveTableauKeyRequirements("starter_treasure_tomb", 1, 0)
    expect(floor1).not.toEqual(floor0)
  })

  it("pathIndex doesn't affect the result — today's data has no per-floor room dimension", () => {
    const a = resolveTableauKeyRequirements("starter_treasure_tomb", 0, 0)
    const b = resolveTableauKeyRequirements("starter_treasure_tomb", 0, 5)
    expect(a).toEqual(b)
  })

  it("returns undefined for a (journey, floor) combination with no matching tableau level", () => {
    expect(resolveTableauKeyRequirements("starter_treasure_tomb", 999, 0)).toBeUndefined()
    expect(resolveTableauKeyRequirements("not-a-real-tomb", 0, 0)).toBeUndefined()
  })
})
