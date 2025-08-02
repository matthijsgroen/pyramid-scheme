/**
 * A tableau is a formula to decrypt by adding symbols to the tableau.
 * Each tableau has a level, which determines the complexity and number of symbols.
 * the symbols come from the inventory.
 */

export type TableauLevel = {
  levelNr: number
  symbolCount: number
  inventoryIds: string[]
  name: string
  description: string
}

export const tableauLevels: TableauLevel[] = [
  // Level 1 - Basic deities (3 symbols from 6)
  {
    levelNr: 1,
    symbolCount: 3,
    inventoryIds: ["d1", "d2", "d3", "d4", "d5", "d6"],
    name: "Scribe's First Lesson",
    description:
      "Learn the most basic hieroglyphs used in ancient Egyptian writing.",
  },

  // Level 2 - More deities (3 symbols from 6)
  {
    levelNr: 2,
    symbolCount: 3,
    inventoryIds: ["d7", "d8", "d9", "d10", "d11", "d12"],
    name: "Temple Inscriptions",
    description: "Decipher sacred symbols found carved on temple walls.",
  },

  // Level 3 - Advanced deities (3 symbols from 5)
  {
    levelNr: 3,
    symbolCount: 3,
    inventoryIds: ["d13", "d14", "d15", "d1", "d2"],
    name: "Royal Cartouche",
    description: "Unlock the mysteries of pharaonic names and titles.",
  },

  // Level 4 - Mixed: professions and animals (4 symbols from 8)
  {
    levelNr: 4,
    symbolCount: 4,
    inventoryIds: ["p1", "p2", "p3", "p4", "a1", "a2", "a3", "a4"],
    name: "Divine Pantheon",
    description: "Channel the power of the major gods in your calculations.",
  },

  // Level 5 - Mixed: more professions and animals (4 symbols from 8)
  {
    levelNr: 5,
    symbolCount: 4,
    inventoryIds: ["p5", "p6", "p7", "p8", "a5", "a6", "a7", "a8"],
    name: "Sacred Assembly",
    description: "Invoke the wisdom of the lesser-known but powerful deities.",
  },

  // Level 6 - Mixed: professions and artifacts (4 symbols from 8)
  {
    levelNr: 6,
    symbolCount: 4,
    inventoryIds: ["p9", "p10", "p11", "p12", "art1", "art2", "art3", "art4"],
    name: "Court of the Pharaoh",
    description:
      "Master the symbols representing the most prestigious roles in Egypt.",
  },

  // Level 7 - Mixed: animals and artifacts (4 symbols from 8)
  {
    levelNr: 7,
    symbolCount: 4,
    inventoryIds: ["a9", "a10", "a11", "a12", "art5", "art6", "art7", "art9"],
    name: "Artisan's Guild",
    description: "Understand the crafts and trades that built ancient Egypt.",
  },

  // Level 8 - Mixed: deities and professions (4 symbols from 8)
  {
    levelNr: 8,
    symbolCount: 4,
    inventoryIds: ["d3", "d4", "d5", "d6", "p13", "p14", "p15", "p1"],
    name: "Sacred Menagerie",
    description: "Harness the spiritual power of Egypt's most revered animals.",
  },

  // Level 9 - Mixed: animals and artifacts (4 symbols from 8)
  {
    levelNr: 9,
    symbolCount: 4,
    inventoryIds: [
      "a13",
      "a14",
      "a15",
      "a1",
      "art10",
      "art11",
      "art12",
      "art14",
    ],
    name: "Nile Creatures",
    description: "Connect with the life-giving spirits of the great river.",
  },

  // Level 10 - Mixed: deities and animals (4 symbols from 8)
  {
    levelNr: 10,
    symbolCount: 4,
    inventoryIds: ["d7", "d8", "d9", "d10", "a2", "a3", "a4", "a5"],
    name: "Celestial Council",
    description: "Complete your understanding of the divine hierarchy.",
  },

  // Level 11 - Mixed: professions and animals (4 symbols from 8)
  {
    levelNr: 11,
    symbolCount: 4,
    inventoryIds: ["p2", "p3", "p4", "p5", "a6", "a7", "a8", "a9"],
    name: "Desert Guardians",
    description: "Master the symbols of the fierce protectors of the sands.",
  },

  // Level 12 - Mixed: all categories (5 symbols from 10)
  {
    levelNr: 12,
    symbolCount: 5,
    inventoryIds: [
      "d11",
      "d12",
      "p6",
      "p7",
      "a10",
      "a11",
      "art15",
      "art1",
      "art2",
      "art3",
    ],
    name: "Tomb Treasures",
    description:
      "Unlock the power of the most sacred artifacts of the pharaohs.",
  },

  // Level 13 - Mixed: remaining items (4 symbols from 8)
  {
    levelNr: 13,
    symbolCount: 4,
    inventoryIds: ["p8", "p9", "a12", "a13", "d13", "d14", "art4", "art5"],
    name: "Temple Servants",
    description: "Honor those who served the gods and maintained divine order.",
  },

  // Level 14 - Mixed: varied categories (5 symbols from 10)
  {
    levelNr: 14,
    symbolCount: 5,
    inventoryIds: [
      "d15",
      "d1",
      "p10",
      "p11",
      "a14",
      "a15",
      "art6",
      "art7",
      "art9",
      "art10",
    ],
    name: "Divine Regalia",
    description: "Wield the symbols of ultimate power and divine authority.",
  },

  // Level 15 - Mixed high-level symbols (5 symbols from 10)
  {
    levelNr: 15,
    symbolCount: 5,
    inventoryIds: [
      "d2",
      "d3",
      "p12",
      "p13",
      "a1",
      "a2",
      "art11",
      "art12",
      "art14",
      "art15",
    ],
    name: "Supreme Mysteries",
    description:
      "Combine the most powerful symbols from all realms of Egyptian knowledge.",
  },

  // Level 16 - Elite mixed symbols (5 symbols from 10)
  {
    levelNr: 16,
    symbolCount: 5,
    inventoryIds: [
      "d4",
      "d5",
      "p14",
      "p15",
      "a3",
      "a4",
      "art1",
      "art2",
      "art3",
      "art4",
    ],
    name: "Pharaoh's Legacy",
    description:
      "Master the ultimate artifacts that represent eternal divine rule.",
  },

  // Level 17 - Elite mixed symbols (5 symbols from 10)
  {
    levelNr: 17,
    symbolCount: 5,
    inventoryIds: [
      "d6",
      "d7",
      "p1",
      "p2",
      "a5",
      "a6",
      "art5",
      "art6",
      "art7",
      "art9",
    ],
    name: "Osiris' Judgment",
    description:
      "Face the ultimate test with symbols of death, rebirth, and divine judgment.",
  },

  // Level 18 - Master mixed symbols (5 symbols from 10)
  {
    levelNr: 18,
    symbolCount: 5,
    inventoryIds: [
      "d8",
      "d9",
      "p3",
      "p4",
      "a7",
      "a8",
      "art10",
      "art11",
      "art12",
      "art14",
    ],
    name: "Architect of Eternity",
    description:
      "Design your path to immortality using the most sacred combinations.",
  },

  // Level 19 - Legendary mixed symbols (5 symbols from 10)
  {
    levelNr: 19,
    symbolCount: 5,
    inventoryIds: [
      "d10",
      "d11",
      "p5",
      "p6",
      "a9",
      "a10",
      "art15",
      "art1",
      "art2",
      "art3",
    ],
    name: "Solar Majesty",
    description: "Channel the combined power of sun, war, and divine creation.",
  },

  // Level 20 - Ultimate mastery (5 symbols from 10)
  {
    levelNr: 20,
    symbolCount: 5,
    inventoryIds: [
      "d12",
      "d13",
      "d14",
      "d15",
      "p7",
      "p8",
      "a11",
      "a12",
      "a13",
      "a15",
    ],
    name: "Ra's Eternal Throne",
    description:
      "Achieve the highest level of Egyptian mystical knowledge and divine authority.",
  },
]
