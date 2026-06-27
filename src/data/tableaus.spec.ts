import { describe, it, expect } from "vitest"
import { generateTableaus, type TableauLevel, tableauLevels, TOMB_SYMBOLS } from "./tableaus"
import tableausTranslations from "../../public/locales/en/tableaus.json"
import { allItems, egyptianAnimals, egyptianArtifacts, egyptianDeities, egyptianProfessions } from "./inventory"
import { journeys } from "./journeys"
import type { Difficulty } from "./difficultyLevels"

describe("Tableau System", () => {
  // Generate tableaux once for all tests

  describe("Basic Structure", () => {
    it("should generate exactly 180 tableaux", () => {
      expect(tableauLevels).toHaveLength(180)
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
        expert_treasure_tomb: 16, // 4 treasures × 4 levels
        expert_treasure_tomb_b: 16, // 4 treasures × 4 levels
        master_treasure_tomb: 25, // 5 treasures × 5 levels
        master_treasure_tomb_b: 25, // 5 treasures × 5 levels
        wizard_treasure_tomb: 24, // 4 treasures × 6 levels
        wizard_treasure_tomb_b: 24, // 4 treasures × 6 levels
        wizard_treasure_tomb_c: 24, // 4 treasures × 6 levels
      })
    })

    it("should have correct symbol counts per tomb", () => {
      const symbolCounts: Record<string, number> = {
        starter_treasure_tomb: 2,
        junior_treasure_tomb: 3,
        expert_treasure_tomb: 4,
        expert_treasure_tomb_b: 4,
        master_treasure_tomb: 4,
        master_treasure_tomb_b: 5,
        wizard_treasure_tomb: 5,
        wizard_treasure_tomb_b: 5,
        wizard_treasure_tomb_c: 5,
      }

      tableauLevels.forEach((tableau: TableauLevel) => {
        const expectedCount = symbolCounts[tableau.tombJourneyId]
        expect(tableau.symbolCount).toBe(expectedCount)
      })
    })
  })

  describe("Run Number Distribution", () => {
    it("should have correct run numbers for starter tomb (4 treasures)", () => {
      const starterTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb")
      expect(starterTableaux).toHaveLength(8)

      // Should have 2 tableaux per run (2 levels per treasure)
      for (let run = 1; run <= 4; run++) {
        const runTableaux = starterTableaux.filter((t: TableauLevel) => t.runNumber === run)
        expect(runTableaux).toHaveLength(2)
      }
    })

    it("should have correct run numbers for junior tomb (6 treasures)", () => {
      const juniorTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb")
      expect(juniorTableaux).toHaveLength(18)

      // Should have 3 tableaux per run (3 levels per treasure)
      for (let run = 1; run <= 6; run++) {
        const runTableaux = juniorTableaux.filter((t: TableauLevel) => t.runNumber === run)
        expect(runTableaux).toHaveLength(3)
      }
    })

    it("should have correct run numbers for expert tomb (4 treasures each, split across 2 tombs)", () => {
      const expertTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "expert_treasure_tomb")
      expect(expertTableaux).toHaveLength(16)

      // Should have 4 tableaux per run (4 levels per treasure)
      for (let run = 1; run <= 4; run++) {
        const runTableaux = expertTableaux.filter((t: TableauLevel) => t.runNumber === run)
        expect(runTableaux).toHaveLength(4)
      }
    })

    it("should have correct run numbers for master tomb (5 treasures each, split across 2 tombs)", () => {
      const masterTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "master_treasure_tomb")
      expect(masterTableaux).toHaveLength(25)

      // Should have 5 tableaux per run (5 levels per treasure)
      for (let run = 1; run <= 5; run++) {
        const runTableaux = masterTableaux.filter((t: TableauLevel) => t.runNumber === run)
        expect(runTableaux).toHaveLength(5)
      }
    })

    it("should have correct run numbers for wizard tomb (4 treasures each, split across 3 tombs)", () => {
      const wizardTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "wizard_treasure_tomb")
      expect(wizardTableaux).toHaveLength(24)

      // Should have 6 tableaux per run (6 levels per treasure)
      for (let run = 1; run <= 4; run++) {
        const runTableaux = wizardTableaux.filter((t: TableauLevel) => t.runNumber === run)
        expect(runTableaux).toHaveLength(6)
      }
    })
  })

  describe("Symbol Progression", () => {
    it("should use only starter symbols for starter tomb", () => {
      const starterSymbols = ["p10", "p8", "a6", "a8", "art1", "art5", "d1"]
      const starterTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb")

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
      const juniorTableaux = tableauLevels.filter((t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb")

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
  })

  describe("Data Integrity", () => {
    it("should have valid tomb journey IDs", () => {
      const validTombIds = journeys.filter(j => j.type === "treasure_tomb").map(j => j.id)

      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(validTombIds).toContain(tableau.tombJourneyId)
      })
    })

    it("should use all symbols from the inventory system", () => {
      // All symbols available in the inventory system
      const allInventorySymbols = allItems.map(item => item.id)
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

    it("should have unique IDs within each tomb", () => {
      const tombIds = [...new Set(tableauLevels.map(t => t.tombJourneyId))]
      tombIds.forEach(tombId => {
        const tombTableaux = tableauLevels.filter(t => t.tombJourneyId === tombId)
        const ids = tombTableaux.map(t => t.id)
        const uniqueIds = [...new Set(ids)]
        expect(ids).toHaveLength(uniqueIds.length)
      })
    })

    it("contains only inventory items from own or lower difficulty for first run", () => {
      const tombs = journeys.filter(j => j.type === "treasure_tomb")
      const allowedDifficulties: Difficulty[] = []
      tombs.forEach(tomb => {
        allowedDifficulties.push(tomb.difficulty)
        const tableaus = tableauLevels.filter(t => t.tombJourneyId === tomb.id && t.runNumber === 1)
        tableaus.forEach((tableau: TableauLevel) => {
          const allowedSymbols = allowedDifficulties.flatMap(difficulty => TOMB_SYMBOLS[difficulty])
          tableau.inventoryIds.forEach((symbolId: string) => {
            expect(allowedSymbols).toContain(symbolId)
          })
        })
      })
    })
  })

  describe("Mathematical Verification", () => {
    it("should match the expected formula: (4*2) + (6*3) + (4+4)*4 + (5+5)*5 + (4+4+4)*6 = 180", () => {
      const starterCount = 4 * 2 // 8
      const juniorCount = 6 * 3 // 18
      const expertCount = (4 + 4) * 4 // 32 split across 2 tombs
      const masterCount = (5 + 5) * 5 // 50 split across 2 tombs
      const wizardCount = (4 + 4 + 4) * 6 // 72 split across 3 tombs
      const expectedTotal = starterCount + juniorCount + expertCount + masterCount + wizardCount

      expect(expectedTotal).toBe(180)
      expect(tableauLevels).toHaveLength(expectedTotal)
    })
  })

  describe("Sampled tableaux", () => {
    const allInventory = [...egyptianDeities, ...egyptianAnimals, ...egyptianArtifacts, ...egyptianProfessions]

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
        (t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb" && t.runNumber === 1
      )
      expect(starterTableaux).toHaveLength(2)

      // Check that the first tableau has the expected properties
      const firstTableau = starterTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "The merchant is granted an ankh, sealing a prosperous deal.",
          "id": "tab_starter_r1_l1",
          "inventoryIds": [
            "p10",
            "art1",
          ],
          "levelNr": 1,
          "name": "Trade Blessing",
          "runNumber": 1,
          "symbolCount": 2,
          "tombJourneyId": "starter_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter(item => firstTableau.inventoryIds.includes(item.id))
        .map(item => item.symbol)
      expect(usedSymbols).toEqual(["𓋹", "𓀃"])
    })

    it("creates a representative tableau for the junior tomb", () => {
      const juniorTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb" && t.runNumber === 1
      )
      expect(juniorTableaux).toHaveLength(3)

      // Check that the first tableau has the expected properties
      const firstTableau = juniorTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "The farmer, Hathor, and a cartouche bring blessing to the estate.",
          "id": "tab_junior_r1_l1",
          "inventoryIds": [
            "p8",
            "d15",
            "art5",
          ],
          "levelNr": 1,
          "name": "Estate Blessing",
          "runNumber": 1,
          "symbolCount": 3,
          "tombJourneyId": "junior_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter(item => firstTableau.inventoryIds.includes(item.id))
        .map(item => item.symbol)
      expect(usedSymbols).toEqual(["𓃒", "𓍷", "𓇅"])
    })

    it("creates a representative tableau for the expert tomb", () => {
      const expertTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "expert_treasure_tomb" && t.runNumber === 1
      )
      expect(expertTableaux).toHaveLength(4)

      // Check that the first tableau has the expected properties
      const firstTableau = expertTableaux[0]
      expect(firstTableau).toMatchInlineSnapshot(`
        {
          "description": "At dawn, the high priest raises the ankh above the altar, the sistrum's chime echoing as sacred oils are poured into the canopic jar. The cartouche glimmers in the morning light, a silent witness to the ritual's power.",
          "id": "tab_expert_r1_l1",
          "inventoryIds": [
            "art1",
            "art5",
            "art6",
            "art3",
          ],
          "levelNr": 1,
          "name": "Ritual of the Sacred Vessels",
          "runNumber": 1,
          "symbolCount": 4,
          "tombJourneyId": "expert_treasure_tomb",
        }
      `)

      const usedSymbols = allInventory
        .filter(item => firstTableau.inventoryIds.includes(item.id))
        .map(item => item.symbol)
      expect(usedSymbols).toEqual(["𓋹", "𓎛", "𓍷", "𓎼"])
    })

    it("creates a representative tableau for the wizard tomb", () => {
      const wizardTableaux = translatedTableauLevels.filter(
        (t: TableauLevel) => t.tombJourneyId === "wizard_treasure_tomb" && t.runNumber === 4
      )
      expect(wizardTableaux).toHaveLength(6)

      // Check that the last tableau has the expected properties
      const lastTableau = wizardTableaux[5]
      expect(lastTableau.tombJourneyId).toBe("wizard_treasure_tomb")
      expect(lastTableau.runNumber).toBe(4)
      expect(lastTableau.levelNr).toBe(6)
      expect(lastTableau.symbolCount).toBe(5)
      expect(lastTableau.inventoryIds).toHaveLength(5)
    })
  })
})
