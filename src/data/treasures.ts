// Treasures found in treasure tomb journeys
// Each treasure corresponds to a specific treasure tomb journey

import type { Difficulty } from "./difficultyLevels"

/**
 * Material tier of inventory items, mapped to difficulty levels:
 * stone=starter, bronze=junior, silver=expert, gold=master, divine=wizard
 */
export type MaterialTier = "stone" | "bronze" | "silver" | "gold" | "divine"

export const materialTierByDifficulty: Record<Difficulty, MaterialTier> = {
  starter: "stone",
  junior: "bronze",
  expert: "silver",
  master: "gold",
  wizard: "divine",
}

export const difficultyByMaterialTier: Record<MaterialTier, Difficulty> = {
  stone: "starter",
  bronze: "junior",
  silver: "expert",
  gold: "master",
  divine: "wizard",
}

export type TreasureEffects = {
  /**
   * Additive bonus added to the base map fragment drop probability per pyramid level completed.
   * E.g. 0.1 adds a 10% chance on top of the base chance.
   * Stacks additively across multiple treasures.
   */
  mapFragmentChance?: number
  /**
   * Additive bonus added to the base probability that any inventory loot drops per pyramid level completed.
   * E.g. 0.1 adds a 10% chance on top of the base drop chance.
   * Stacks additively across multiple treasures.
   */
  higherLootChance?: number
  /**
   * Count the number of owned treasures with this effect to determine how many miscalculated blocks
   * are highlighted in real-time while solving a pyramid puzzle.
   * E.g. owning 2 treasures with errorHighlight highlights the first 2 wrong blocks.
   */
  errorHighlight?: boolean
  /**
   * Count the number of owned treasures with this effect to determine how many checkpoint blocks
   * in the pyramid display a magical border with live correct/incorrect feedback.
   * E.g. owning 2 treasures with earlyFeedback activates more checkpoint blocks.
   */
  earlyFeedback?: boolean
  /**
   * Per pyramid level completed, rolls a seeded chance to drop one extra inventory item.
   * If tier is specified, the bonus item is from that material tier.
   * If tier is omitted, the bonus item matches the current pyramid's difficulty tier.
   * Multiple treasures with this effect stack additively on the chance.
   * E.g. { chance: 0.2, tier: "stone" } = 20% chance of an extra Stone item per level.
   * E.g. { chance: 0.2 } = 20% chance of an extra item matching the current pyramid tier.
   */
  moreLootChance?: { chance: number; tier?: MaterialTier }
  /**
   * At the end of a completed pyramid expedition, awards a guaranteed number of inventory items
   * of the specified material tier.
   * Stacks additively — owning two treasures with the same tier doubles the bonus.
   * E.g. { amount: 1, tier: "gold" } = 1 extra Gold item on expedition completion.
   */
  expeditionBonus?: { amount: number; tier: MaterialTier }
  /**
   * Count the number of owned treasures with this effect to determine how many hidden hieroglyph
   * blocks the player may unlock per pyramid level. Unlocking a block lets the player write in
   * their calculated value, removing the need to hold it in memory.
   * E.g. owning 2 treasures with hieroglyphUnlock allows writing down 2 hidden block values per level.
   */
  hieroglyphUnlock?: boolean
}

export type Treasure = {
  id: string
  name: string
  symbol: string
  description: string
  effects?: TreasureEffects
}

export const merchantCacheTreasures: Treasure[] = [
  {
    id: "t1",
    name: "Silver Deben",
    symbol: "𓈖",
    description: "An ancient Egyptian silver coin used by merchants for trade along the Nile.",
    effects: { mapFragmentChance: 0.1 },
  },
  {
    id: "t2",
    name: "Papyrus Scroll",
    symbol: "𓅱",
    description: "A merchant's record scroll detailing trade routes and precious cargo manifests.",
    effects: { higherLootChance: 0.1 },
  },
  {
    id: "t3",
    name: "Ivory Comb",
    symbol: "𓌴",
    description: "An intricately carved ivory comb, a luxury item traded from distant lands.",
    effects: { moreLootChance: { chance: 0.2, tier: "stone" } },
  },
  {
    id: "t4",
    name: "Ceramic Oil Lamp",
    symbol: "𓈗",
    description: "A simple yet elegant oil lamp used to light the merchant's quarters.",
    effects: { expeditionBonus: { amount: 1, tier: "stone" } },
  },
]

export const nobleVaultTreasures: Treasure[] = [
  {
    id: "t5",
    name: "Golden Bracelet",
    symbol: "𓈾",
    description: "An ornate golden bracelet adorned with precious stones, worn by Egyptian nobility.",
    effects: { moreLootChance: { chance: 0.2, tier: "stone" } },
  },
  {
    id: "t6",
    name: "Ceremonial Dagger",
    symbol: "𓌑",
    description: "A ritual dagger with a jeweled handle, used in noble ceremonies.",
    effects: { mapFragmentChance: 0.1 },
  },
  {
    id: "t7",
    name: "Jade Scarab",
    symbol: "𓆣",
    description: "A protective jade scarab amulet, symbol of rebirth and eternal life.",
    effects: { higherLootChance: 0.1 },
  },
  {
    id: "t8",
    name: "Alabaster Canopic Jar",
    symbol: "𓎯",
    description: "An elegant alabaster jar used to store precious oils and perfumes.",
    effects: { expeditionBonus: { amount: 1, tier: "stone" } },
  },
  {
    id: "t9",
    name: "Ebony Walking Stick",
    symbol: "𓋴",
    description: "A polished ebony walking stick topped with a golden ankh symbol.",
    effects: { moreLootChance: { chance: 0.2, tier: "bronze" } },
  },
  {
    id: "t10",
    name: "Lapis Lazuli Necklace",
    symbol: "𓍿",
    description: "A stunning necklace made from rare lapis lazuli stones, prized by the wealthy.",
    effects: { expeditionBonus: { amount: 1, tier: "bronze" } },
  },
]

export const templeSecretsTreasures: Treasure[] = [
  {
    id: "t11",
    name: "Sacred Ankh",
    symbol: "𓎬",
    description: "A golden ankh symbol representing eternal life, blessed by the temple priests.",
    effects: { errorHighlight: true },
  },
  {
    id: "t12",
    name: "Copper Mirror",
    symbol: "𓈭",
    description: "A polished copper mirror used for ritual purification ceremonies.",
    effects: { earlyFeedback: true },
  },
  {
    id: "t13",
    name: "Incense Burner",
    symbol: "𓌃",
    description: "An ornate bronze incense burner used in temple worship rituals.",
    effects: { mapFragmentChance: 0.1 },
  },
  {
    id: "t14",
    name: "Ritual Chalice",
    symbol: "𓊃",
    description: "A sacred silver chalice used for libation offerings to the gods.",
    effects: { moreLootChance: { chance: 0.2, tier: "bronze" } },
  },
  {
    id: "t15",
    name: "Ceremonial Fan",
    symbol: "𓈂",
    description: "An ornate feathered fan used by priests during temple ceremonies.",
    effects: { expeditionBonus: { amount: 1, tier: "bronze" } },
  },
  {
    id: "t16",
    name: "Prayer Beads",
    symbol: "𓏓",
    description: "A string of blessed prayer beads used for meditation and worship.",
    effects: { moreLootChance: { chance: 0.2, tier: "silver" } },
  },
  {
    id: "t17",
    name: "Holy Water Vessel",
    symbol: "𓍵",
    description: "A vessel containing blessed water from the sacred temple well.",
    effects: { expeditionBonus: { amount: 1, tier: "silver" } },
  },
  {
    id: "t18",
    name: "Temple Bell",
    symbol: "𓏁",
    description: "A bronze bell used to call the faithful to prayer and announce ceremonies.",
    effects: { mapFragmentChance: 0.1 },
  },
]

export const ancientRelicsTreasures: Treasure[] = [
  {
    id: "t19",
    name: "Pharaoh's Seal",
    symbol: "𓈯",
    description: "An ancient royal seal bearing the cartouche of a forgotten pharaoh.",
    effects: { moreLootChance: { chance: 0.2, tier: "silver" } },
  },
  {
    id: "t20",
    name: "Crystal Orb",
    symbol: "𓋑",
    description: "A mystical crystal orb said to reveal visions of the past and future.",
    effects: { expeditionBonus: { amount: 1, tier: "silver" } },
  },
  {
    id: "t21",
    name: "Hieroglyphic Tablet",
    symbol: "𓁷",
    description: "An ancient stone tablet inscribed with mysterious hieroglyphic prophecies.",
    effects: { moreLootChance: { chance: 0.2, tier: "gold" } },
  },
  {
    id: "t22",
    name: "Golden Scepter",
    symbol: "𓌂",
    description: "A magnificent golden scepter topped with the eye of Horus.",
    effects: { expeditionBonus: { amount: 1, tier: "gold" } },
  },
  {
    id: "t23",
    name: "Obsidian Knife",
    symbol: "𓍊",
    description: "A razor-sharp obsidian ceremonial knife used in ancient rituals.",
    effects: { errorHighlight: true },
  },
  {
    id: "t24",
    name: "Meteorite Fragment",
    symbol: "𓍗",
    description: "A piece of sacred meteorite believed to contain divine power.",
    effects: { hieroglyphUnlock: true },
  },
  {
    id: "t25",
    name: "Ancient Compass",
    symbol: "𓌻",
    description: "A mystical navigation device that always points toward hidden treasures.",
    effects: { moreLootChance: { chance: 0.2, tier: "gold" } },
  },
  {
    id: "t26",
    name: "Time Crystal",
    symbol: "𓆕",
    description: "A legendary crystal that glows with the power of ages past.",
    effects: { hieroglyphUnlock: true },
  },
  {
    id: "t27",
    name: "Ritual Mask",
    symbol: "𓆜",
    description: "An ornate golden mask worn by high priests during sacred ceremonies.",
    effects: { expeditionBonus: { amount: 1, tier: "gold" } },
  },
  {
    id: "t28",
    name: "Eternal Flame Torch",
    symbol: "𓆘",
    description: "A torch that burns with an eternal flame, never extinguished since ancient times.",
    effects: { earlyFeedback: true },
  },
]

export const mythicalArtifactsTreasures: Treasure[] = [
  {
    id: "t29",
    name: "Crown of Ra",
    symbol: "𓆰",
    description: "The legendary crown of the sun god Ra, radiating divine light and power.",
    effects: { moreLootChance: { chance: 0.2, tier: "divine" } },
  },
  {
    id: "t30",
    name: "Staff of Thoth",
    symbol: "𓎘",
    description: "The wisdom staff of Thoth, god of knowledge, containing all ancient secrets.",
    effects: { expeditionBonus: { amount: 1, tier: "divine" } },
  },
  {
    id: "t31",
    name: "Feather of Ma'at",
    symbol: "𓆃",
    description: "The sacred feather of Ma'at, goddess of truth, used to weigh souls in the afterlife.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t32",
    name: "Tears of Isis",
    symbol: "𓁺",
    description: "Crystallized tears of the goddess Isis, said to grant eternal protection.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t33",
    name: "Heart of Osiris",
    symbol: "𓇺",
    description: "The preserved heart of Osiris, lord of the underworld, pulsing with life force.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t34",
    name: "Eye of Horus Amulet",
    symbol: "𓃮",
    description: "The ultimate protective amulet containing the complete power of Horus.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t35",
    name: "Serpent of Apep",
    symbol: "𓍝",
    description: "A bound fragment of the chaos serpent Apep, contained within a sacred vessel.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t36",
    name: "Breath of Shu",
    symbol: "𓊪",
    description: "A vial containing the breath of Shu, god of air, granting power over the winds.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t37",
    name: "Scale of Sobek",
    symbol: "𓆎",
    description: "A single scale from the crocodile god Sobek, providing protection in water.",
    effects: { moreLootChance: { chance: 0.2, tier: "divine" } },
  },
  {
    id: "t38",
    name: "Anubis Guardian Statue",
    symbol: "𓃣",
    description: "A miniature statue of Anubis that comes alive to guard its owner's treasures.",
    effects: { expeditionBonus: { amount: 1, tier: "divine" } },
  },
  {
    id: "t39",
    name: "Book of the Dead",
    symbol: "𓆲",
    description: "The complete Book of the Dead, containing all spells needed for the afterlife journey.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
  {
    id: "t40",
    name: "Pyramid Capstone",
    symbol: "𓂻",
    description: "The golden capstone of the Great Pyramid, containing the concentrated power of all pharaohs.",
    effects: { moreLootChance: { chance: 0.2 } },
  },
]

export const allTreasures = [
  ...merchantCacheTreasures,
  ...nobleVaultTreasures,
  ...templeSecretsTreasures,
  ...ancientRelicsTreasures,
  ...mythicalArtifactsTreasures,
]

export const difficultyTreasures: Record<Difficulty, Treasure[]> = {
  starter: merchantCacheTreasures,
  junior: nobleVaultTreasures,
  expert: templeSecretsTreasures,
  master: ancientRelicsTreasures,
  wizard: mythicalArtifactsTreasures,
}
