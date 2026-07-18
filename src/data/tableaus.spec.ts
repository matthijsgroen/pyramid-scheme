import { describe, it, expect } from "vitest"
import { generateTableaus, type TableauLevel, tableauLevels, TOMB_SYMBOLS, TABLEAUS_PER_FLOOR } from "./tableaus"
import tableausTranslations from "../../public/locales/en/tableaus.json"
import { egyptianAnimals, egyptianArtifacts, egyptianDeities, egyptianProfessions } from "./inventory"
import { journeys, type TreasureTombJourney } from "./journeys"
import type { Difficulty } from "./difficultyLevels"

const tombJourneys = journeys.filter((j): j is TreasureTombJourney => j.type === "treasure_tomb")

describe("Tableau System", () => {
  // N tableau rooms per tomb floor (pyramid-interior-design.md §8) — a tier's tomb may be split
  // across several journeys once a single tomb got too large; each floor of each tomb presents
  // TABLEAUS_PER_FLOOR[tier] sequential rooms. See src/data/tableaus.ts's own comment.

  describe("Basic Structure", () => {
    it("generates TABLEAUS_PER_FLOOR tableaux per tomb floor", () => {
      const expectedTotal = tombJourneys.reduce(
        (sum, tomb) => sum + tomb.levelCount * TABLEAUS_PER_FLOOR[tomb.difficulty],
        0
      )
      expect(tableauLevels).toHaveLength(expectedTotal)
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
    it("has levelCount × TABLEAUS_PER_FLOOR tableaus per tomb, levelNr 1..N on each floor", () => {
      for (const tomb of tombJourneys) {
        const n = TABLEAUS_PER_FLOOR[tomb.difficulty]
        const tombTableaux = tableauLevels.filter(t => t.tombJourneyId === tomb.id)
        expect(tombTableaux).toHaveLength(tomb.levelCount * n)
        for (let floor = 1; floor <= tomb.levelCount; floor++) {
          const rooms = tombTableaux.filter(t => t.runNumber === floor)
          expect(rooms.map(t => t.levelNr).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
        }
      }
    })

    it("should have correct symbol counts per tomb", () => {
      for (const tomb of tombJourneys) {
        const tombTableaux = tableauLevels.filter(t => t.tombJourneyId === tomb.id)
        tombTableaux.forEach(tableau => expect(tableau.symbolCount).toBe(tomb.levelSettings.symbolCount))
      }
    })

    it("secondary tombs of the same tier get independent symbol allocations, not a copy of the primary", () => {
      const byTier = new Map<Difficulty, TreasureTombJourney[]>()
      for (const tomb of tombJourneys) byTier.set(tomb.difficulty, [...(byTier.get(tomb.difficulty) ?? []), tomb])
      for (const [, tombs] of byTier) {
        if (tombs.length < 2) continue
        const [first, ...rest] = tombs
        const firstIds = tableauLevels.filter(t => t.tombJourneyId === first.id).map(t => t.inventoryIds.join(","))
        for (const other of rest) {
          const otherIds = tableauLevels.filter(t => t.tombJourneyId === other.id).map(t => t.inventoryIds.join(","))
          expect(otherIds).not.toEqual(firstIds)
        }
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
      const validTombIds = tombJourneys.map(j => j.id)

      tableauLevels.forEach((tableau: TableauLevel) => {
        expect(validTombIds).toContain(tableau.tombJourneyId)
      })
    })

    it("should use every hieroglyph symbol at least once", () => {
      const usedSymbols = new Set<string>()
      tableauLevels.forEach((tableau: TableauLevel) => {
        tableau.inventoryIds.forEach((symbolId: string) => usedSymbols.add(symbolId))
      })

      const allTombSymbols = Object.values(TOMB_SYMBOLS).flat()
      allTombSymbols.forEach(symbol => expect(usedSymbols.has(symbol)).toBe(true))
      expect(usedSymbols.size).toBe(allTombSymbols.length)
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

    it("contains only inventory items from own or lower difficulty for the first floor", () => {
      const allowedDifficulties: Difficulty[] = []
      let lastDifficulty: Difficulty | undefined
      tombJourneys.forEach(tomb => {
        if (tomb.difficulty !== lastDifficulty) {
          allowedDifficulties.push(tomb.difficulty)
          lastDifficulty = tomb.difficulty
        }
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

    it("creates a representative tableau for the starter tomb's first floor", () => {
      const firstTableau = translatedTableauLevels.find(
        (t: TableauLevel) => t.tombJourneyId === "starter_treasure_tomb" && t.runNumber === 1
      )!
      expect(firstTableau.symbolCount).toBe(2)
      expect(firstTableau.levelNr).toBe(1)
      expect(firstTableau.inventoryIds).toHaveLength(2)

      const usedSymbols = allInventory
        .filter(item => firstTableau.inventoryIds.includes(item.id))
        .map(item => item.symbol)
      expect(usedSymbols).toHaveLength(2)
    })

    it("creates a representative tableau for the junior tomb's first floor", () => {
      const firstTableau = translatedTableauLevels.find(
        (t: TableauLevel) => t.tombJourneyId === "junior_treasure_tomb" && t.runNumber === 1
      )!
      expect(firstTableau.symbolCount).toBe(3)
      expect(firstTableau.levelNr).toBe(1)
      expect(firstTableau.inventoryIds).toHaveLength(3)
    })

    it("creates a representative tableau for the expert tomb's last floor", () => {
      const expertTomb = tombJourneys.find(j => j.id === "expert_treasure_tomb")!
      const lastTableau = translatedTableauLevels.find(
        (t: TableauLevel) => t.tombJourneyId === "expert_treasure_tomb" && t.runNumber === expertTomb.levelCount
      )!
      expect(lastTableau.symbolCount).toBe(4)
      expect(lastTableau.levelNr).toBe(1)
      expect(lastTableau.inventoryIds).toHaveLength(4)
    })

    it("creates a representative tableau for the wizard tomb's last floor", () => {
      const wizardTomb = tombJourneys.find(j => j.id === "wizard_treasure_tomb")!
      const lastTableau = translatedTableauLevels.find(
        (t: TableauLevel) => t.tombJourneyId === "wizard_treasure_tomb" && t.runNumber === wizardTomb.levelCount
      )!
      expect(lastTableau.tombJourneyId).toBe("wizard_treasure_tomb")
      expect(lastTableau.runNumber).toBe(wizardTomb.levelCount)
      expect(lastTableau.levelNr).toBe(1)
      expect(lastTableau.symbolCount).toBe(5)
      expect(lastTableau.inventoryIds).toHaveLength(5)
    })
  })
})
