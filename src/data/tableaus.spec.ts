import { describe, it, expect } from "vitest"
import { generateTableaus, type TableauLevel, tableauLevels } from "./tableaus"
import tableausTranslations from "../../public/locales/en/tableaus.json"
import {
  egyptianAnimals,
  egyptianArtifacts,
  egyptianDeities,
  egyptianProfessions,
} from "./inventory"

describe("Tableau System", () => {
  // Generate tableaux once for all tests

  describe("Basic Structure", () => {
    it("should generate exactly 180 tableaux", () => {
      expect(tableauLevels).toHaveLength(180)
    })

    it("should have sequential level numbers starting from 1", () => {
      tableauLevels.forEach((tableau: TableauLevel, index: number) => {
        expect(tableau.levelNr).toBe(index + 1)
      })
    })

    it("should have all required properties", () => {
      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(tableau).toHaveProperty("levelNr")
        expect(tableau).toHaveProperty("symbolCount")
        expect(tableau).toHaveProperty("inventoryIds")
        expect(tableau).toHaveProperty("tombJourneyId")
        expect(tableau).toHaveProperty("runNumber")
        expect(tableau).toHaveProperty("name")
        expect(tableau).toHaveProperty("description")
      })
    })
  })

  describe("Tomb Distribution", () => {
    it("should have correct tableau count per tomb", () => {
      const distribution = tableauLevels.reduce<Record<string, number>>(
        (acc: Record<string, number>, tableau: TableauLevel) => {
          acc[tableau.tombJourneyId] = (acc[tableau.tombJourneyId] || 0) + 1
          return acc
        },
        {}
      )

      expect(distribution).toEqual({
        starter_treasure_tomb: 8, // 4 treasures × 2 levels
        junior_treasure_tomb: 18, // 6 treasures × 3 levels
        expert_treasure_tomb: 32, // 8 treasures × 4 levels
        master_treasure_tomb: 50, // 10 treasures × 5 levels
        wizard_treasure_tomb: 72, // 12 treasures × 6 levels
      })
    })

    it("should have correct symbol counts per tomb", () => {
      const symbolCounts: Record<string, number> = {
        starter_treasure_tomb: 2,
        junior_treasure_tomb: 3,
        expert_treasure_tomb: 4,
        master_treasure_tomb: 5,
        wizard_treasure_tomb: 6,
      }

      tableauLevels.forEach((tableau: TableauLevel) => {
        const expectedCount = symbolCounts[tableau.tombJourneyId]
        expect(tableau.symbolCount).toBe(expectedCount)
        expect(tableau.inventoryIds).toHaveLength(expectedCount)
      })
    })
  })

  describe("Run Number Distribution", () => {
    it("should have correct run numbers for starter tomb (4 treasures)", () => {
      const starterTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb"
      )
      expect(starterTableaux).toHaveLength(8)

      // Should have 2 tableaux per run (2 levels per treasure)
      for (let run = 1; run <= 4; run++) {
        const runTableaux = starterTableaux.filter(
          (t: TableauLevel) => t.runNumber === run
        )
        expect(runTableaux).toHaveLength(2)
      }
    })

    it("should have correct run numbers for junior tomb (6 treasures)", () => {
      const juniorTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb"
      )
      expect(juniorTableaux).toHaveLength(18)

      // Should have 3 tableaux per run (3 levels per treasure)
      for (let run = 1; run <= 6; run++) {
        const runTableaux = juniorTableaux.filter(
          (t: TableauLevel) => t.runNumber === run
        )
        expect(runTableaux).toHaveLength(3)
      }
    })

    it("should have correct run numbers for expert tomb (8 treasures)", () => {
      const expertTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "expert_treasure_tomb"
      )
      expect(expertTableaux).toHaveLength(32)

      // Should have 4 tableaux per run (4 levels per treasure)
      for (let run = 1; run <= 8; run++) {
        const runTableaux = expertTableaux.filter(
          (t: TableauLevel) => t.runNumber === run
        )
        expect(runTableaux).toHaveLength(4)
      }
    })

    it("should have correct run numbers for master tomb (10 treasures)", () => {
      const masterTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "master_treasure_tomb"
      )
      expect(masterTableaux).toHaveLength(50)

      // Should have 5 tableaux per run (5 levels per treasure)
      for (let run = 1; run <= 10; run++) {
        const runTableaux = masterTableaux.filter(
          (t: TableauLevel) => t.runNumber === run
        )
        expect(runTableaux).toHaveLength(5)
      }
    })

    it("should have correct run numbers for wizard tomb (12 treasures)", () => {
      const wizardTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "wizard_treasure_tomb"
      )
      expect(wizardTableaux).toHaveLength(72)

      // Should have 6 tableaux per run (6 levels per treasure)
      for (let run = 1; run <= 12; run++) {
        const runTableaux = wizardTableaux.filter(
          (t: TableauLevel) => t.runNumber === run
        )
        expect(runTableaux).toHaveLength(6)
      }
    })
  })

  describe("Symbol Progression", () => {
    it("should use only starter symbols for starter tomb", () => {
      const starterSymbols = ["p10", "p8", "a6", "a8", "art1", "art5", "d1"]
      const starterTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb"
      )

      starterTableaux.forEach((tableau: TableauLevel) => {
        tableau.inventoryIds.forEach((symbolId: string) => {
          expect(starterSymbols).toContain(symbolId)
        })
      })
    })

    it("should use starter + junior symbols for junior tomb", () => {
      const allowedSymbols = [
        "p10",
        "p8",
        "a6",
        "a8",
        "art1",
        "art5",
        "d1", // starter
        "p1",
        "p11",
        "p9",
        "a2",
        "a13",
        "art2",
        "art7",
        "art12",
        "d2",
        "d15", // junior
      ]
      const juniorTableaux = tableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb"
      )

      juniorTableaux.forEach((tableau: TableauLevel) => {
        tableau.inventoryIds.forEach((symbolId: string) => {
          expect(allowedSymbols).toContain(symbolId)
        })
      })
    })
  })

  describe("Story Consistency", () => {
    it("should have non-empty names and descriptions", () => {
      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(tableau.name).toBeTruthy()
        expect(tableau.name.length).toBeGreaterThan(0)
        expect(tableau.description).toBeTruthy()
        expect(tableau.description.length).toBeGreaterThan(0)
      })
    })

    it("should have consistent symbols for the same story template", () => {
      // Group tableaux by tomb and template name
      const storyGroups = tableauLevels.reduce(
        (acc: Record<string, TableauLevel[]>, tableau: TableauLevel) => {
          const key = `${tableau.tombJourneyId}:${tableau.name}`
          if (!acc[key]) acc[key] = []
          acc[key].push(tableau)
          return acc
        },
        {} as Record<string, TableauLevel[]>
      )

      // Each story template should have consistent symbol selection
      Object.values(storyGroups).forEach((group: unknown) => {
        const tableaux = group as TableauLevel[]
        if (tableaux.length > 1) {
          const firstSymbols = tableaux[0].inventoryIds.sort()
          tableaux.slice(1).forEach((tableau: TableauLevel) => {
            expect(tableau.inventoryIds.sort()).toEqual(firstSymbols)
          })
        }
      })
    })
  })

  describe("Data Integrity", () => {
    it("should have valid tomb journey IDs", () => {
      const validTombIds = [
        "starter_treasure_tomb",
        "junior_treasure_tomb",
        "expert_treasure_tomb",
        "master_treasure_tomb",
        "wizard_treasure_tomb",
      ]

      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(validTombIds).toContain(tableau.tombJourneyId)
      })
    })

    it("should use all symbols from the inventory system", () => {
      // All symbols available in the inventory system
      const allInventorySymbols = [
        // Starter symbols
        "p10",
        "p8",
        "a6",
        "a8",
        "art1",
        "art5",
        "d1",
        // Junior symbols
        "p1",
        "p11",
        "p9",
        "a2",
        "a13",
        "art2",
        "art7",
        "art12",
        "d2",
        "d15",
        // Expert symbols
        "p2",
        "p3",
        "p7",
        "p12",
        "a5",
        "a7",
        "a11",
        "art3",
        "art4",
        "art6",
        "art14",
        "d3",
        "d4",
        "d9",
        // Master symbols
        "p4",
        "p5",
        "p14",
        "p15",
        "a1",
        "a3",
        "a14",
        "a15",
        "art9",
        "art10",
        "art11",
        "art15",
        "d5",
        "d6",
        "d10",
        // Wizard symbols
        "p6",
        "p13",
        "a4",
        "a9",
        "a10",
        "a12",
        "d7",
        "d8",
        "d11",
        "d12",
        "d13",
        "d14",
      ]

      // Collect all symbols used in tableaux
      const usedSymbols = new Set<string>()
      tableauLevels.forEach((tableau: TableauLevel) => {
        tableau.inventoryIds.forEach((symbolId: string) => {
          usedSymbols.add(symbolId)
        })
      })

      // Verify that every inventory symbol is used at least once
      allInventorySymbols.forEach((symbol: string) => {
        expect(usedSymbols.has(symbol)).toBe(true)
      })

      // Verify we're not using any symbols that aren't in the inventory
      Array.from(usedSymbols).forEach((symbol: string) => {
        expect(allInventorySymbols).toContain(symbol)
      })

      // Verify the counts match exactly
      expect(usedSymbols.size).toBe(allInventorySymbols.length)
    })

    it("should have positive run numbers", () => {
      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(tableau.runNumber).toBeGreaterThan(0)
      })
    })

    it("should have valid symbol counts", () => {
      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(tableau.symbolCount).toBeGreaterThan(0)
        expect(tableau.symbolCount).toBeLessThanOrEqual(6)
      })
    })

    it("should have unique level numbers", () => {
      const levelNumbers = tableauLevels.map((t: TableauLevel) => t.levelNr)
      const uniqueLevelNumbers = [...new Set(levelNumbers)]
      expect(levelNumbers).toHaveLength(uniqueLevelNumbers.length)
    })
  })

  describe("Mathematical Verification", () => {
    it("should match the expected formula: 4*2 + 6*3 + 8*4 + 10*5 + 12*6 = 180", () => {
      const starterCount = 4 * 2 // 8
      const juniorCount = 6 * 3 // 18
      const expertCount = 8 * 4 // 32
      const masterCount = 10 * 5 // 50
      const wizardCount = 12 * 6 // 72
      const expectedTotal =
        starterCount + juniorCount + expertCount + masterCount + wizardCount

      expect(expectedTotal).toBe(180)
      expect(tableauLevels).toHaveLength(expectedTotal)
    })

    it("should have correct level sequence within each tomb", () => {
      const tombTableaux = {
        starter_treasure_tomb: tableauLevels.filter(
          (t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb"
        ),
        junior_treasure_tomb: tableauLevels.filter(
          (t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb"
        ),
        expert_treasure_tomb: tableauLevels.filter(
          (t: TableauLevel) => t.tombJourneyId === "expert_treasure_tomb"
        ),
        master_treasure_tomb: tableauLevels.filter(
          (t: TableauLevel) => t.tombJourneyId === "master_treasure_tomb"
        ),
        wizard_treasure_tomb: tableauLevels.filter(
          (t: TableauLevel) => t.tombJourneyId === "wizard_treasure_tomb"
        ),
      }

      // Verify that level numbers are consecutive within the entire sequence
      let expectedLevelNr = 1
      const tombOrder = [
        "starter_treasure_tomb",
        "junior_treasure_tomb",
        "expert_treasure_tomb",
        "master_treasure_tomb",
        "wizard_treasure_tomb",
      ]

      tombOrder.forEach((tombId: string) => {
        const tableaux = tombTableaux[tombId as keyof typeof tombTableaux]
        tableaux.forEach((tableau: TableauLevel) => {
          expect(tableau.levelNr).toBe(expectedLevelNr)
          expectedLevelNr++
        })
      })
    })
  })

  describe("Sampled tableaux", () => {
    const allInventory = [
      ...egyptianDeities,
      ...egyptianAnimals,
      ...egyptianArtifacts,
      ...egyptianProfessions,
    ]

    // Create translation function that looks up keys in the loaded translations
    const t = (key: string) => {
      const keys = key.split(".")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = tableausTranslations
      for (const k of keys) {
        value = value?.[k]
      }
      return value || key
    }

    const translatedTableauLevels = generateTableaus(t)

    it("creates a representative tableau for the starter tomb", () => {
      const starterTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) =>
          t.tombJourneyId === "starter_treasure_tomb" && t.runNumber === 1
      )
      expect(starterTableaux).toHaveLength(2)

      // Check that the first tableau has the expected properties
      const firstTableau = starterTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "The merchant trades with the farmer under Ra's blessing.",
          "inventoryIds": [
            "art1",
            "d1",
          ],
          "levelNr": 1,
          "name": "Golden Honey",
          "runNumber": 1,
          "symbolCount": 2,
          "tombJourneyId": "starter_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter((item) => firstTableau.inventoryIds.includes(item.id))
        .map((item) => item.symbol)
      expect(usedSymbols).toEqual(["𓇳", "𓋹"])
    })

    it("creates a representative tableau for the junior tomb", () => {
      const juniorTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) =>
          t.tombJourneyId === "junior_treasure_tomb" && t.runNumber === 1
      )
      expect(juniorTableaux).toHaveLength(3)

      // Check that the first tableau has the expected properties
      const firstTableau = juniorTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "The Pharaoh blesses the merchant's trade with sacred lions.",
          "inventoryIds": [
            "p11",
            "p10",
            "p1",
          ],
          "levelNr": 9,
          "name": "Royal Merchant",
          "runNumber": 1,
          "symbolCount": 3,
          "tombJourneyId": "junior_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter((item) => firstTableau.inventoryIds.includes(item.id))
        .map((item) => item.symbol)
      expect(usedSymbols).toEqual(["𓁫", "𓀃", "𓀄"])
    })

    it("creates a representative tableau for the expert tomb", () => {
      const expertTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) =>
          t.tombJourneyId === "expert_treasure_tomb" && t.runNumber === 1
      )
      expect(expertTableaux).toHaveLength(4)

      // Check that the first tableau has the expected properties
      const firstTableau = expertTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "Horus blesses the temple with sistrum music and sacred ankh.",
          "inventoryIds": [
            "art14",
            "p1",
            "p10",
            "d2",
          ],
          "levelNr": 27,
          "name": "Vulture Guardian",
          "runNumber": 1,
          "symbolCount": 4,
          "tombJourneyId": "expert_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter((item) => firstTableau.inventoryIds.includes(item.id))
        .map((item) => item.symbol)
      expect(usedSymbols).toEqual(["𓃥", "𓆸", "𓁫", "𓀃"])
    })

    it("creates a representative tableau for the wizard tomb", () => {
      const wizardTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) =>
          t.tombJourneyId === "wizard_treasure_tomb" && t.runNumber === 12
      )
      expect(wizardTableaux).toHaveLength(6)

      // Check that the first tableau has the expected properties
      const firstTableau = wizardTableaux[5]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "Divine unity encompasses all aspects of eternal cosmic truth and wisdom.",
          "inventoryIds": [
            "art11",
            "p11",
            "d3",
            "art15",
            "p3",
            "p1",
          ],
          "levelNr": 180,
          "name": "Divine Perfect",
          "runNumber": 12,
          "symbolCount": 6,
          "tombJourneyId": "wizard_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter((item) => firstTableau.inventoryIds.includes(item.id))
        .map((item) => item.symbol)
      expect(usedSymbols).toEqual(["𓅃", "𓉶", "𓆓", "𓁫", "𓁁", "𓀄"])
    })
  })
})
