/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau is assigned to a specific treasure tomb journey and tells a thematic story.
 * Symbols are assigned progressively - each tomb gets new symbols plus access to previous tomb symbols.
 */

import { mulberry32, shuffle } from "@/game/random"
import { difficulties, type Difficulty } from "./difficultyLevels"
import { journeys, type TreasureTombJourney } from "./journeys"

export type TableauLevel = {
  id: string
  levelNr: number
  symbolCount: number
  inventoryIds: string[]
  tombJourneyId: string
  runNumber: number
  name: string
  description: string
}

// Translation function type
type TranslationFunction = (key: string) => string

// Symbol inventory for each tomb level
const TOMB_SYMBOLS: Record<Difficulty, string[]> = {
  starter: ["p10", "p8", "art1", "a6", "a8", "art5", "d1"],
  junior: [
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
  ],
  expert: [
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
  ],
  master: [
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
  ],
  wizard: [
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
  ],
}

// Get translated tomb name
export function getTombName(tombId: string, t?: TranslationFunction): string {
  if (t) {
    return t(`tombNames.${tombId}`)
  }

  // Fallback for when translation function is not available
  switch (tombId) {
    case "starter_treasure_tomb":
      return "Forgotten Merchant's Cache"
    case "junior_treasure_tomb":
      return "Noble's Hidden Vault"
    case "expert_treasure_tomb":
      return "High Priest's Treasury"
    case "master_treasure_tomb":
      return "Pharaoh's Secret Hoard"
    case "wizard_treasure_tomb":
      return "Vault of the Gods"
    default:
      return "Unknown Tomb"
  }
}

// Get translated story template name
function getStoryTemplateName(
  tombId: string,
  runNr: number,
  levelNr: number,
  t?: TranslationFunction
): string {
  if (t) {
    return t(`storyTemplates.${tombId}.run${runNr}_level${levelNr}`)
  }

  // Fallback - capitalize and replace underscores
  return `a cryptic text about ${getTombName(tombId)}`
}

// Get translated description
function getTableauDescription(
  tombId: string,
  runNr: number,
  levelNr: number,
  t?: TranslationFunction
): string {
  if (t) {
    return t(`descriptions.${tombId}.run${runNr}_level${levelNr}`)
  }

  // Fallback description
  return `Sacred tableau from ${getTombName(tombId)}`
}

const random = mulberry32(9248529837592)

const tombJourneys = journeys.filter(
  (j): j is TreasureTombJourney => j.type === "treasure_tomb"
)

const collectAllAvailableSymbols = (difficulties: Difficulty[]) =>
  difficulties.flatMap((difficulty) => TOMB_SYMBOLS[difficulty] || [])

const tableauInventory: Record<string, string[]> = difficulties.reduce(
  (acc, difficulty, i, list) => {
    const tombInfo = tombJourneys.find((j) => j.difficulty === difficulty)
    if (!tombInfo) throw new Error("no tomb info for difficulty " + difficulty)
    const symbols = collectAllAvailableSymbols(list.slice(0, i + 1))

    const shuffledSymbols = shuffle(symbols, random)

    return (
      tombInfo?.treasures.reduce((innerAcc, _treasure, treasureIndex) => {
        for (let level = 1; level <= tombInfo.levelCount; level++) {
          const startSymbolIndex =
            treasureIndex *
              tombInfo.levelCount *
              tombInfo.levelSettings.symbolCount +
            level * tombInfo.levelSettings.symbolCount -
            1

          const tableauSymbols: string[] = []
          for (let s = 0; s < tombInfo.levelSettings.symbolCount; s++) {
            const symbolIndex = (startSymbolIndex + s) % shuffledSymbols.length
            tableauSymbols.push(shuffledSymbols[symbolIndex])
          }

          innerAcc[`tab_${difficulty}_r${treasureIndex + 1}_l${level}`] =
            tableauSymbols
        }

        return innerAcc
      }, acc) ?? acc
    )
  },
  {} as Record<string, string[]>
)

// Generate all tableau levels with i18n support
export function generateTableaus(t?: TranslationFunction): TableauLevel[] {
  const tableaus: TableauLevel[] = []

  tombJourneys.forEach((tomb) => {
    for (let treasure = 1; treasure <= tomb.treasures.length; treasure++) {
      for (let level = 1; level <= tomb.levelCount; level++) {
        const tableauSymbols =
          tableauInventory[`tab_${tomb.difficulty}_r${treasure}_l${level}`]

        tableaus.push({
          id: `tab_${tomb.difficulty}_r${treasure}_l${level}`,
          levelNr: level,
          symbolCount: tomb.levelSettings.symbolCount,
          inventoryIds: tableauSymbols,
          tombJourneyId: tomb.id,
          runNumber: treasure,
          name: getStoryTemplateName(tomb.id, treasure, level, t),
          description: getTableauDescription(tomb.id, treasure, level, t),
        })
      }
    }
  })

  return tableaus
}

const tableauLevels = generateTableaus()

// Export tomb configuration for other modules
export { TOMB_SYMBOLS, tableauLevels }
