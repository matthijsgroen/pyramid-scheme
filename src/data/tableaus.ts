/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau is assigned to a specific treasure tomb journey and tells a thematic story.
 * Symbols are assigned progressively - each tomb gets new symbols plus access to previous tomb symbols.
 */

import type { Difficulty } from "./difficultyLevels"

export type TableauLevel = {
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
  starter: ["p10", "p8", "a6", "a8", "art1", "art5", "d1"],
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

// Get available symbols for a tomb (including all previous tomb symbols)
function getSymbolsForTomb(tombType: string): string[] {
  const symbols = [...TOMB_SYMBOLS.starter]
  if (tombType === "starter_treasure_tomb") return symbols

  symbols.push(...TOMB_SYMBOLS.junior)
  if (tombType === "junior_treasure_tomb") return symbols

  symbols.push(...TOMB_SYMBOLS.expert)
  if (tombType === "expert_treasure_tomb") return symbols

  symbols.push(...TOMB_SYMBOLS.master)
  if (tombType === "master_treasure_tomb") return symbols

  symbols.push(...TOMB_SYMBOLS.wizard)
  return symbols
}

// Tomb configuration: treasures × levels = total tableaux per tomb
const TOMB_CONFIG = [
  {
    id: "starter_treasure_tomb",
    treasures: 4,
    levels: 2,
    symbolCount: 2,
  },
  {
    id: "junior_treasure_tomb",
    treasures: 6,
    levels: 3,
    symbolCount: 3,
  },
  {
    id: "expert_treasure_tomb",
    treasures: 8,
    levels: 4,
    symbolCount: 4,
  },
  {
    id: "master_treasure_tomb",
    treasures: 10,
    levels: 5,
    symbolCount: 5,
  },
  {
    id: "wizard_treasure_tomb",
    treasures: 12,
    levels: 6,
    symbolCount: 6,
  },
]

// Story template keys for each tomb
const STORY_TEMPLATE_KEYS = {
  starter_treasure_tomb: [
    "merchants_trade",
    "sacred_market",
    "blessed_commerce",
    "divine_cartouche",
    "farmers_offering",
    "river_blessing",
    "golden_honey",
    "ras_protection",
  ],
  junior_treasure_tomb: [
    "royal_merchant",
    "viziers_wisdom",
    "noble_rams",
    "lions_court",
    "artisans_craft",
    "divine_authority",
    "sacred_beehive",
    "farmers_ram",
    "noble_fish",
    "viziers_ankh",
    "royal_protection",
    "artisans_ram",
    "lions_regalia",
    "sacred_cartouche",
    "eye_of_protection",
    "farmers_blessing",
    "viziers_fish",
    "noble_assembly",
  ],
  expert_treasure_tomb: [
    "sacred_ritual",
    "embalmers_art",
    "oracles_vision",
    "divine_geese",
    "temple_blessing",
    "eternal_preservation",
    "monkey_wisdom",
    "sacred_canopic",
    "high_priests_power",
    "vulture_guardian",
    "lotus_prophecy",
    "divine_djed",
    "temple_harmony",
    "sacred_animals",
    "divine_council",
    "eternal_blessing",
    "priests_ceremony",
    "oracles_wisdom",
    "sacred_preservation",
    "divine_unity",
    "temple_masters",
    "sacred_guardians",
    "divine_symbols",
    "eternal_ritual",
    "sacred_assembly",
    "divine_worship",
    "eternal_temple",
    "sacred_mastery",
    "divine_completion",
    "temple_eternity",
    "sacred_perfection",
    "divine_glory",
  ],
  master_treasure_tomb: [
    "royal_architects",
    "eternal_guardians",
    "desert_monuments",
    "solar_crown",
    "desert_sentinel",
    "mighty_foundations",
    "eternal_watchers",
    "royal_construction",
    "divine_builders",
    "guardian_of_beasts",
    "royal_solar_journey",
    "divine_architecture",
    "pharaohs_menagerie",
    "royal_solar_empire",
    "monument_of_eternity",
    "empire_of_divine",
    "master_builders",
    "solar_guardians",
    "desert_empire",
    "royal_monuments",
    "divine_construction",
    "eternal_empire",
    "solar_mastery",
    "royal_divinity",
    "master_architecture",
    "divine_monuments",
    "solar_eternity",
    "royal_mastery",
    "divine_empire",
    "solar_glory",
    "royal_perfection",
    "master_divinity",
    "solar_completion",
    "royal_eternity",
    "divine_mastery",
    "solar_perfection",
    "royal_glory",
    "divine_completion",
    "solar_divinity",
    "royal_transcendence",
    "divine_solar_empire",
    "eternal_royal_glory",
    "master_divine_solar",
    "royal_solar_mastery",
    "divine_eternal_solar",
    "royal_solar_perfection",
    "master_solar_divinity",
    "divine_royal_completion",
    "solar_divine_mastery",
    "royal_divine_perfection",
  ],
  wizard_treasure_tomb: [
    "divine_healers",
    "creatures_of_wisdom",
    "sacred_healing",
    "night_voyagers",
    "divine_messengers",
    "healing_voyage",
    "ancient_wisdom",
    "healing_waters",
    "divine_navigation",
    "divine_assembly",
    "sacred_voyage",
    "wisdom_council",
    "divine_harmony",
    "royal_construction",
    "divine_creatures",
    "temple_ceremony",
    "divine_mastery",
    "supreme_authority",
    "ultimate_unity",
    "cosmic_harmony",
    "divine_transcendence",
    "sacred_mastery",
    "eternal_wisdom",
    "divine_completion",
    "sacred_transcendence",
    "divine_perfection",
    "cosmic_mastery",
    "sacred_glory",
    "divine_eternity",
    "cosmic_divinity",
    "sacred_completion",
    "divine_cosmos",
    "cosmic_transcendence",
    "divine_ultimate",
    "sacred_ultimate",
    "cosmic_glory",
    "divine_infinity",
    "sacred_infinity",
    "cosmic_completion",
    "divine_cosmic",
    "sacred_cosmic",
    "ultimate_divinity",
    "cosmic_perfection",
    "divine_supreme",
    "sacred_supreme",
    "ultimate_cosmic",
    "divine_eternal",
    "sacred_eternal",
    "cosmic_eternal",
    "ultimate_eternal",
    "divine_absolute",
    "sacred_absolute",
    "cosmic_absolute",
    "ultimate_absolute",
    "divine_infinite",
    "sacred_infinite",
    "cosmic_infinite",
    "ultimate_infinite",
    "divine_perfect",
    "sacred_perfect",
    "cosmic_perfect",
    "ultimate_perfect",
    "divine_complete",
    "sacred_complete",
    "cosmic_complete",
    "ultimate_complete",
    "divine_total",
    "sacred_total",
    "cosmic_total",
    "ultimate_total",
    "divine_final",
    "sacred_final",
    "cosmic_final",
    "ultimate_final",
    "divine_end",
    "sacred_end",
    "cosmic_end",
    "ultimate_end",
    "divine_unity",
    "sacred_unity",
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
  templateKey: string,
  t?: TranslationFunction
): string {
  if (t) {
    return t(`storyTemplates.${tombId}.${templateKey}`)
  }

  // Fallback - capitalize and replace underscores
  return templateKey
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Get translated description
function getTableauDescription(
  tombId: string,
  descriptionKey: string,
  t?: TranslationFunction
): string {
  if (t) {
    return t(`descriptions.${tombId}.${descriptionKey}`)
  }

  // Fallback description
  return `Sacred tableau from ${getTombName(tombId)}`
}

/**
 * Deterministic shuffle using Linear Congruential Generator (LCG)
 * This ensures the same seed always produces the same sequence
 */
function deterministicShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  let rng = seed

  // LCG parameters (same as used by Numerical Recipes)
  const a = 1664525
  const c = 1013904223
  const m = Math.pow(2, 32)

  for (let i = result.length - 1; i > 0; i--) {
    rng = (a * rng + c) % m
    const j = Math.floor((rng / m) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * Generate description keys for tableaux
 */
function generateDescriptionKeys(tombId: string, count: number): string[] {
  const keys: string[] = []

  if (tombId === "starter_treasure_tomb") {
    return [
      "merchant_trade_blessing",
      "sacred_marketplace",
      "ankh_blessing",
      "sacred_cartouche",
      "farmer_honey_offering",
      "divine_fish",
      "blessed_honey",
      "ra_protection",
    ]
  } else if (tombId === "junior_treasure_tomb") {
    return [
      "pharaoh_blessing",
      "vizier_guidance",
      "sacred_rams",
      "lion_court",
      "artisan_forge",
      "divine_authority",
      "blessed_honey",
      "farmer_rams",
      "noble_pools",
      "vizier_protection",
      "merchant_service",
      "artisan_rams",
      "lion_regalia",
      "pharaoh_name",
      "eye_protection",
      "farmer_blessing",
      "vizier_fish",
      "noble_assembly",
    ]
  } else if (tombId === "expert_treasure_tomb") {
    // Generate numbered ceremony keys
    for (let i = 1; i <= count; i++) {
      keys.push(`temple_ceremony_${i}`)
    }
  } else if (tombId === "master_treasure_tomb") {
    // Generate numbered construction project keys
    for (let i = 1; i <= count; i++) {
      keys.push(`construction_project_${i}`)
    }
  } else if (tombId === "wizard_treasure_tomb") {
    // Generate numbered cosmic ritual keys
    for (let i = 1; i <= count; i++) {
      keys.push(`cosmic_ritual_${i}`)
    }
  }

  return keys
}

// Generate all tableau levels with i18n support
export function generateTableaus(t?: TranslationFunction): TableauLevel[] {
  const tableaus: TableauLevel[] = []
  let levelCounter = 1

  TOMB_CONFIG.forEach((tomb) => {
    const symbols = getSymbolsForTomb(tomb.id)
    const totalTableaux = tomb.treasures * tomb.levels
    const storyTemplateKeys =
      STORY_TEMPLATE_KEYS[tomb.id as keyof typeof STORY_TEMPLATE_KEYS]
    const descriptionKeys = generateDescriptionKeys(tomb.id, totalTableaux)

    // Create a combined seed from tomb ID for consistent shuffling
    const tombSeed = tomb.id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)

    // Shuffle symbols and story templates deterministically
    const shuffledSymbols = deterministicShuffle(symbols, tombSeed)
    const shuffledStoryKeys = deterministicShuffle(
      [...storyTemplateKeys],
      tombSeed + 1
    )

    for (let treasure = 1; treasure <= tomb.treasures; treasure++) {
      for (let level = 1; level <= tomb.levels; level++) {
        const tableauIndex = (treasure - 1) * tomb.levels + (level - 1)
        const storyKeyIndex = tableauIndex % shuffledStoryKeys.length
        const descKeyIndex = tableauIndex % descriptionKeys.length

        // Get symbols for this tableau
        const startSymbolIndex =
          (tableauIndex * tomb.symbolCount) % shuffledSymbols.length
        const tableauSymbols = []
        for (let s = 0; s < tomb.symbolCount; s++) {
          const symbolIndex = (startSymbolIndex + s) % shuffledSymbols.length
          tableauSymbols.push(shuffledSymbols[symbolIndex])
        }

        const storyKey = shuffledStoryKeys[storyKeyIndex]
        const descKey = descriptionKeys[descKeyIndex]

        tableaus.push({
          levelNr: levelCounter++,
          symbolCount: tomb.symbolCount,
          inventoryIds: tableauSymbols,
          tombJourneyId: tomb.id,
          runNumber: treasure,
          name: getStoryTemplateName(tomb.id, storyKey, t),
          description: getTableauDescription(tomb.id, descKey, t),
        })
      }
    }
  })

  return tableaus
}

const tableauLevels = generateTableaus()

// Export tomb configuration for other modules
export { TOMB_CONFIG, TOMB_SYMBOLS, tableauLevels }
