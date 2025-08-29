/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau is assigned to a specific treasure tomb journey and tells a thematic story.
 * Symbols are assigned progressively - each tomb gets new symbols plus access to previous tomb symbols.
 */

import type { Difficulty } from "./difficultyLevels"

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
const tableauInventory: Record<string, string[]> = {
  // starter
  tab2: ["a8", "d1"],
  tab3: ["a8", "a6"],
  tab4: ["a6", "art1"],
  tab5: ["p10", "art5"],
  tab6: ["p8", "d1"],
  tab7: ["a6", "art5"],
  tab8: ["art1", "a8"],
  tab9: ["p10", "d1"],
  // junior
  tab10: ["a2", "p10", "p1"],
  tab11: ["p11", "art2", "p9"],
  tab12: ["a13", "d15", "art7"],
  tab13: ["d2", "a2", "art12"],
  tab14: ["p10", "art12", "d1"],
  tab15: ["d1", "p1", "art12"],
  tab16: ["art2", "p1", "a8"],
  tab17: ["a13", "d15", "p8"],
  // checked ^
  tab18: ["d2", "art7", "art2"],
  tab19: ["a13", "art12", "a6"],
  tab20: ["p9", "art1", "d1"],
  tab21: ["p8", "p11", "p10"],
  tab22: ["p1", "a8", "a2"],
  tab23: ["d15", "art5", "d2"],
  tab24: ["art7", "art2", "a13"],
  tab25: ["art12", "a6", "p9"],
  tab26: ["art1", "d1", "p8"],
  tab27: ["p11", "p10", "p1"],
  // expert
  tab28: ["art14", "p1", "p10", "d2"],
  tab29: ["p11", "art5", "art6", "art2"],
  tab30: ["p8", "p2", "a6", "p9"],
  tab31: ["art7", "d9", "d3", "a5"],
  tab32: ["d4", "a13", "a2", "a7"],
  tab33: ["a8", "p3", "p7", "d1"],
  tab34: ["d15", "a11", "art4", "p12"],
  tab35: ["art3", "art12", "art1", "art14"],
  tab36: ["p1", "p10", "d2", "p11"],
  tab37: ["art5", "art6", "art2", "p8"],
  tab38: ["p2", "a6", "p9", "art7"],
  tab39: ["d9", "d3", "a5", "d4"],
  tab40: ["a13", "a2", "a7", "a8"],
  tab41: ["p3", "p7", "d1", "d15"],
  tab42: ["a11", "art4", "p12", "art3"],
  tab43: ["art12", "art1", "art14", "p1"],
  tab44: ["p10", "d2", "p11", "art5"],
  tab45: ["art6", "art2", "p8", "p2"],
  tab46: ["a6", "p9", "art7", "d9"],
  tab47: ["d3", "a5", "d4", "a13"],
  tab48: ["a2", "a7", "a8", "p3"],
  tab49: ["p7", "d1", "d15", "a11"],
  tab50: ["art4", "p12", "art3", "art12"],
  tab51: ["art1", "art14", "p1", "p10"],
  tab52: ["d2", "p11", "art5", "art6"],
  tab53: ["art2", "p8", "p2", "a6"],
  tab54: ["p9", "art7", "d9", "d3"],
  tab55: ["a5", "d4", "a13", "a2"],
  tab56: ["a7", "a8", "p3", "p7"],
  tab57: ["d1", "d15", "a11", "art4"],
  tab58: ["p12", "art3", "art12", "art1"],
  tab59: ["art14", "p1", "p10", "d2"],
  // master
  tab60: ["p1", "p14", "p3", "art9", "d10"],
  tab61: ["art7", "art12", "d2", "p7", "a11"],
  tab62: ["a3", "a1", "p9", "d1", "a2"],
  tab63: ["art3", "d15", "p5", "a5", "p15"],
  tab64: ["art15", "a7", "art11", "art4", "d4"],
  tab65: ["p8", "d9", "d6", "p10", "p4"],
  tab66: ["art1", "a8", "p11", "a14", "art6"],
  tab67: ["d5", "art5", "d3", "a13", "p12"],
  tab68: ["a15", "art10", "art2", "art14", "p2"],
  tab69: ["a6", "p1", "p14", "p3", "art9"],
  tab70: ["d10", "art7", "art12", "d2", "p7"],
  tab71: ["a11", "a3", "a1", "p9", "d1"],
  tab72: ["a2", "art3", "d15", "p5", "a5"],
  tab73: ["p15", "art15", "a7", "art11", "art4"],
  tab74: ["d4", "p8", "d9", "d6", "p10"],
  tab75: ["p4", "art1", "a8", "p11", "a14"],
  tab76: ["art6", "d5", "art5", "d3", "a13"],
  tab77: ["p12", "a15", "art10", "art2", "art14"],
  tab78: ["p2", "a6", "p1", "p14", "p3"],
  tab79: ["art9", "d10", "art7", "art12", "d2"],
  tab80: ["p7", "a11", "a3", "a1", "p9"],
  tab81: ["d1", "a2", "art3", "d15", "p5"],
  tab82: ["a5", "p15", "art15", "a7", "art11"],
  tab83: ["art4", "d4", "p8", "d9", "d6"],
  tab84: ["p10", "p4", "art1", "a8", "p11"],
  tab85: ["a14", "art6", "d5", "art5", "d3"],
  tab86: ["a13", "p12", "a15", "art10", "art2"],
  tab87: ["art14", "p2", "a6", "p1", "p14"],
  tab88: ["p3", "art9", "d10", "art7", "art12"],
  tab89: ["d2", "p7", "a11", "a3", "a1"],
  tab90: ["p9", "d1", "a2", "art3", "d15"],
  tab91: ["p5", "a5", "p15", "art15", "a7"],
  tab92: ["art11", "art4", "d4", "p8", "d9"],
  tab93: ["d6", "p10", "p4", "art1", "a8"],
  tab94: ["p11", "a14", "art6", "d5", "art5"],
  tab95: ["d3", "a13", "p12", "a15", "art10"],
  tab96: ["art2", "art14", "p2", "a6", "p1"],
  tab97: ["p14", "p3", "art9", "d10", "art7"],
  tab98: ["art12", "d2", "p7", "a11", "a3"],
  tab99: ["a1", "p9", "d1", "a2", "art3"],
  tab100: ["d15", "p5", "a5", "p15", "art15"],
  tab101: ["a7", "art11", "art4", "d4", "p8"],
  tab102: ["d9", "d6", "p10", "p4", "art1"],
  tab103: ["a8", "p11", "a14", "art6", "d5"],
  tab104: ["art5", "d3", "a13", "p12", "a15"],
  tab105: ["art10", "art2", "art14", "p2", "a6"],
  tab106: ["p1", "p14", "p3", "art9", "d10"],
  tab107: ["art7", "art12", "d2", "p7", "a11"],
  tab108: ["a3", "a1", "p9", "d1", "a2"],
  tab109: ["art3", "d15", "p5", "a5", "p15"],
  // wizard
  tab110: ["a7", "d9", "p6", "a2", "art9", "p5"],
  tab111: ["art4", "art14", "a11", "p4", "a12", "a1"],
  tab112: ["art10", "d15", "a13", "a14", "d12", "art3"],
  tab113: ["p12", "d7", "art11", "p11", "d3", "art15"],
  tab114: ["p3", "p1", "d5", "d1", "d13", "a9"],
  tab115: ["art7", "d10", "d11", "d14", "d4", "d8"],
  tab116: ["a10", "p7", "a4", "art5", "a6", "a15"],
  tab117: ["p2", "art2", "p10", "p14", "p9", "p8"],
  tab118: ["a5", "art12", "d6", "p15", "a3", "d2"],
  tab119: ["art6", "art1", "p13", "a8", "a7", "d9"],
  tab120: ["p6", "a2", "art9", "p5", "art4", "art14"],
  tab121: ["a11", "p4", "a12", "a1", "art10", "d15"],
  tab122: ["a13", "a14", "d12", "art3", "p12", "d7"],
  tab123: ["art11", "p11", "d3", "art15", "p3", "p1"],
  tab124: ["d5", "d1", "d13", "a9", "art7", "d10"],
  tab125: ["d11", "d14", "d4", "d8", "a10", "p7"],
  tab126: ["a4", "art5", "a6", "a15", "p2", "art2"],
  tab127: ["p10", "p14", "p9", "p8", "a5", "art12"],
  tab128: ["d6", "p15", "a3", "d2", "art6", "art1"],
  tab129: ["p13", "a8", "a7", "d9", "p6", "a2"],
  tab130: ["art9", "p5", "art4", "art14", "a11", "p4"],
  tab131: ["a12", "a1", "art10", "d15", "a13", "a14"],
  tab132: ["d12", "art3", "p12", "d7", "art11", "p11"],
  tab133: ["d3", "art15", "p3", "p1", "d5", "d1"],
  tab134: ["d13", "a9", "art7", "d10", "d11", "d14"],
  tab135: ["d4", "d8", "a10", "p7", "a4", "art5"],
  tab136: ["a6", "a15", "p2", "art2", "p10", "p14"],
  tab137: ["p9", "p8", "a5", "art12", "d6", "p15"],
  tab138: ["a3", "d2", "art6", "art1", "p13", "a8"],
  tab139: ["a7", "d9", "p6", "a2", "art9", "p5"],
  tab140: ["art4", "art14", "a11", "p4", "a12", "a1"],
  tab141: ["art10", "d15", "a13", "a14", "d12", "art3"],
  tab142: ["p12", "d7", "art11", "p11", "d3", "art15"],
  tab143: ["p3", "p1", "d5", "d1", "d13", "a9"],
  tab144: ["art7", "d10", "d11", "d14", "d4", "d8"],
  tab145: ["a10", "p7", "a4", "art5", "a6", "a15"],
  tab146: ["p2", "art2", "p10", "p14", "p9", "p8"],
  tab147: ["a5", "art12", "d6", "p15", "a3", "d2"],
  tab148: ["art6", "art1", "p13", "a8", "a7", "d9"],
  tab149: ["p6", "a2", "art9", "p5", "art4", "art14"],
  tab150: ["a11", "p4", "a12", "a1", "art10", "d15"],
  tab151: ["a13", "a14", "d12", "art3", "p12", "d7"],
  tab152: ["art11", "p11", "d3", "art15", "p3", "p1"],
  tab153: ["d5", "d1", "d13", "a9", "art7", "d10"],
  tab154: ["d11", "d14", "d4", "d8", "a10", "p7"],
  tab155: ["a4", "art5", "a6", "a15", "p2", "art2"],
  tab156: ["p10", "p14", "p9", "p8", "a5", "art12"],
  tab157: ["d6", "p15", "a3", "d2", "art6", "art1"],
  tab158: ["p13", "a8", "a7", "d9", "p6", "a2"],
  tab159: ["art9", "p5", "art4", "art14", "a11", "p4"],
  tab160: ["a12", "a1", "art10", "d15", "a13", "a14"],
  tab161: ["d12", "art3", "p12", "d7", "art11", "p11"],
  tab162: ["d3", "art15", "p3", "p1", "d5", "d1"],
  tab163: ["d13", "a9", "art7", "d10", "d11", "d14"],
  tab164: ["d4", "d8", "a10", "p7", "a4", "art5"],
  tab165: ["a6", "a15", "p2", "art2", "p10", "p14"],
  tab166: ["p9", "p8", "a5", "art12", "d6", "p15"],
  tab167: ["a3", "d2", "art6", "art1", "p13", "a8"],
  tab168: ["a7", "d9", "p6", "a2", "art9", "p5"],
  tab169: ["art4", "art14", "a11", "p4", "a12", "a1"],
  tab170: ["art10", "d15", "a13", "a14", "d12", "art3"],
  tab171: ["p12", "d7", "art11", "p11", "d3", "art15"],
  tab172: ["p3", "p1", "d5", "d1", "d13", "a9"],
  tab173: ["art7", "d10", "d11", "d14", "d4", "d8"],
  tab174: ["a10", "p7", "a4", "art5", "a6", "a15"],
  tab175: ["p2", "art2", "p10", "p14", "p9", "p8"],
  tab176: ["a5", "art12", "d6", "p15", "a3", "d2"],
  tab177: ["art6", "art1", "p13", "a8", "a7", "d9"],
  tab178: ["p6", "a2", "art9", "p5", "art4", "art14"],
  tab179: ["a11", "p4", "a12", "a1", "art10", "d15"],
  tab180: ["a13", "a14", "d12", "art3", "p12", "d7"],
  tab181: ["art11", "p11", "d3", "art15", "p3", "p1"],
}

// Generate all tableau levels with i18n support
export function generateTableaus(t?: TranslationFunction): TableauLevel[] {
  const tableaus: TableauLevel[] = []
  let expectedLevelNr = 1

  TOMB_CONFIG.forEach((tomb) => {
    const totalTableaux = tomb.treasures * tomb.levels
    const storyTemplateKeys =
      STORY_TEMPLATE_KEYS[tomb.id as keyof typeof STORY_TEMPLATE_KEYS]
    const descriptionKeys = generateDescriptionKeys(tomb.id, totalTableaux)

    // Create a combined seed from tomb ID for consistent shuffling
    const tombSeed = tomb.id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)

    // Shuffle symbols and story templates deterministically
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

        const storyKey = shuffledStoryKeys[storyKeyIndex]
        const descKey = descriptionKeys[descKeyIndex]
        expectedLevelNr++
        const tableauSymbols = tableauInventory[`tab${expectedLevelNr}`]

        tableaus.push({
          id: `tab${expectedLevelNr}`,
          levelNr: level,
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
export { TOMB_SYMBOLS, tableauLevels }
