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
  it("pathIndex 0 selects levelNr 1 — the tomb's one tableau puzzle per floor", () => {
    const tombId = "starter_treasure_tomb"
    const expected = realTableau(tombId, 1, 1)!
    expect(
      resolveTableauKeyRequirements({ journeyId: tombId, floorIndex: 0, pathIndex: 0, encounterArgs: { runNr: 1 } })
    ).toEqual(expected.inventoryIds.map(id => `hieroglyph:${id}`))
  })

  it("a pathIndex beyond 0 has no matching levelNr — one tableau puzzle per floor, not several", () => {
    const tombId = "starter_treasure_tomb"
    expect(() =>
      resolveTableauKeyRequirements({ journeyId: tombId, floorIndex: 0, pathIndex: 1, encounterArgs: { runNr: 1 } })
    ).toThrow()
  })

  it("runNr selects which treasure's tableau, independent of floorIndex", () => {
    const tombId = "starter_treasure_tomb"
    const run1 = resolveTableauKeyRequirements({
      journeyId: tombId,
      floorIndex: 0,
      pathIndex: 0,
      encounterArgs: { runNr: 1 },
    })
    const run2 = resolveTableauKeyRequirements({
      journeyId: tombId,
      floorIndex: 0,
      pathIndex: 0,
      encounterArgs: { runNr: 2 },
    })
    expect(run2).not.toEqual(run1)
  })

  it("floorIndex doesn't affect the result — runNr/pathIndex fully determine the lookup", () => {
    const tombId = "starter_treasure_tomb"
    const a = resolveTableauKeyRequirements({
      journeyId: tombId,
      floorIndex: 0,
      pathIndex: 0,
      encounterArgs: { runNr: 1 },
    })
    const b = resolveTableauKeyRequirements({
      journeyId: tombId,
      floorIndex: 99,
      pathIndex: 0,
      encounterArgs: { runNr: 1 },
    })
    expect(a).toEqual(b)
  })

  it("throws when encounterArgs is missing or malformed", () => {
    const tombId = "starter_treasure_tomb"
    const base = { journeyId: tombId, floorIndex: 0, pathIndex: 0 }
    expect(() => resolveTableauKeyRequirements({ ...base, encounterArgs: undefined })).toThrow()
    expect(() => resolveTableauKeyRequirements({ ...base, encounterArgs: {} })).toThrow()
    expect(() => resolveTableauKeyRequirements({ ...base, encounterArgs: { runNr: -1 } })).toThrow()
    expect(() => resolveTableauKeyRequirements({ ...base, encounterArgs: { runNr: "1" } })).toThrow()
  })

  it("throws for a (journey, runNr, levelNr) combination with no matching tableau level", () => {
    expect(() =>
      resolveTableauKeyRequirements({
        journeyId: "starter_treasure_tomb",
        floorIndex: 0,
        pathIndex: 999,
        encounterArgs: { runNr: 1 },
      })
    ).toThrow()
    expect(() =>
      resolveTableauKeyRequirements({
        journeyId: "not-a-real-tomb",
        floorIndex: 0,
        pathIndex: 0,
        encounterArgs: { runNr: 1 },
      })
    ).toThrow()
  })
})
