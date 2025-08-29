import type { DayNightCycleStep } from "@/ui/backdropSelection"
import type { Difficulty } from "./difficultyLevels"
import {
  ancientRelicsTreasures,
  merchantCacheTreasures,
  mythicalArtifactsTreasures,
  nobleVaultTreasures,
  templeSecretsTreasures,
  type Treasure,
} from "./treasures"
import type { Operation } from "@/app/Formulas/formulas"

/**
 * JourneyLength:
 * - short: 3-4 levels
 * - medium: 5-7 levels
 * - long: 7-10 levels
 */

export type Journey = PyramidJourney | TreasureTombJourney

export type PyramidJourney = {
  id: string
  name: string
  type: "pyramid"
  description: string
  difficulty: "starter" | "junior" | "expert" | "master" | "wizard"
  journeyLength: "short" | "medium" | "long"
  levelCount: number
  background: {
    time: DayNightCycleStep
    timeStepSize?: number
    showNile?: boolean
  }
  levelSettings: {
    startFloorCount: number
    endFloorCount?: number
    blocksOpen?: [minPercentage: number, maxPercentage: number]
    blocksOpenRestricted?: number[] // Blocking of specific floors for opening blocks
    blocksBlocked?: [minPercentage: number, maxPercentage: number]
    blocksBlockedRestricted?: number[] // Blocking of specific floors for blocking blocks
    startNumberRange: [min: number, max: number]
    endNumberRange?: [min: number, max: number]
  }
  rewards: {
    mapPiece: {
      startChance: number
      chanceIncrease: number
    }
    completed: {
      pieces: [min: number, max: number]
    }
  }
}

export type TreasureTombJourney = {
  id: string
  name: string
  type: "treasure_tomb"
  description: string
  difficulty: Difficulty
  journeyLength: "short" | "medium" | "long"
  levelCount: number
  treasures: Treasure[]
  levelSettings: {
    numberRange: [min: number, max: number]
    operators: Operation[]
    compareAmount: number
  }
}

export const journeys: Journey[] = [
  // Starter Difficulty Journeys
  {
    id: "starter_1",
    name: "Dawn at the Sphinx",
    type: "pyramid",
    description:
      "Begin your adventure with the Great Sphinx as the morning sun illuminates its ancient face. A gentle introduction to the mysteries of Egypt.",
    difficulty: "starter",
    journeyLength: "short",
    levelCount: 3,
    background: {
      time: "morning",
    },
    levelSettings: {
      startFloorCount: 3,
      blocksOpenRestricted: [0], // no blocks opening at bottom floor
      blocksOpen: [0.5, 1],
      startNumberRange: [1, 3],
    },
    rewards: {
      mapPiece: {
        startChance: 0,
        chanceIncrease: 1,
      },
      completed: {
        pieces: [1, 2],
      },
    },
  },
  {
    id: "starter_2",
    name: "Papyrus Merchant's Route",
    type: "pyramid",
    description:
      "Follow the trade routes of ancient papyrus merchants along the peaceful banks of the Nile. Discover the secrets of Egyptian commerce.",
    difficulty: "starter",
    journeyLength: "short",
    levelCount: 4,
    background: {
      time: "afternoon",
      showNile: true,
    },
    levelSettings: {
      startFloorCount: 3,
      blocksOpenRestricted: [3], // never open top of pyramid
      blocksOpen: [0.6, 1],
      startNumberRange: [1, 3],
      endNumberRange: [2, 4],
    },
    rewards: {
      mapPiece: {
        startChance: 0.4,
        chanceIncrease: 0.2,
      },
      completed: {
        pieces: [1, 2],
      },
    },
  },
  {
    id: "starter_3",
    name: "Temple of Bastet",
    type: "pyramid",
    description:
      "Visit the sacred temple of the cat goddess Bastet, where faithful worshippers bring offerings and seek protection from evil spirits.",
    difficulty: "starter",
    journeyLength: "medium",
    levelCount: 5,
    background: {
      time: "evening",
    },
    levelSettings: {
      startFloorCount: 3,
      endFloorCount: 4,
      blocksOpen: [0.6, 1],
      startNumberRange: [1, 4],
      endNumberRange: [1, 5],
    },
    rewards: {
      mapPiece: {
        startChance: 0.5,
        chanceIncrease: 0.25,
      },
      completed: {
        pieces: [2, 2],
      },
    },
  },
  {
    id: "starter_4",
    name: "Scribe's Academy",
    type: "pyramid",
    description:
      "Learn the art of hieroglyphic writing in the prestigious scribe's academy, where knowledge is more valuable than gold.",
    difficulty: "starter",
    journeyLength: "medium",
    levelCount: 5,
    background: {
      time: "night",
    },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [1, 4],
      endNumberRange: [2, 7],
    },
    rewards: {
      mapPiece: {
        startChance: 0.29,
        chanceIncrease: 0.12,
      },
      completed: {
        pieces: [2, 2],
      },
    },
  },

  // Starter Treasure Tomb Journey
  {
    id: "starter_treasure_tomb",
    name: "Forgotten Merchant's Cache",
    type: "treasure_tomb",
    description:
      "Discover a small underground chamber where an ancient merchant hid his precious goods. A perfect introduction to treasure hunting.",
    difficulty: "starter",
    journeyLength: "short",
    levelCount: 2,
    treasures: merchantCacheTreasures,
    levelSettings: {
      numberRange: [1, 5],
      operators: ["+"],
      compareAmount: 0,
    },
  },

  // Junior Difficulty Journeys
  {
    id: "junior_1",
    name: "Sacred Ibis Migration",
    type: "pyramid",
    description:
      "Follow the sacred ibis birds on their annual migration along the Nile. Learn the patterns that ancient Egyptians used to predict the flood.",
    difficulty: "junior",
    journeyLength: "short",
    levelCount: 3,
    background: {
      time: "morning",
      showNile: true,
    },
    levelSettings: {
      startFloorCount: 4,
      endFloorCount: 5,
      startNumberRange: [1, 5],
      endNumberRange: [2, 8],
      blocksOpen: [0.5, 0.5],
    },
    rewards: {
      mapPiece: {
        startChance: 0.2,
        chanceIncrease: 0.18,
      },
      completed: {
        pieces: [2, 3],
      },
    },
  },
  {
    id: "junior_2",
    name: "Valley of the Artisans",
    type: "pyramid",
    description:
      "Explore the village where skilled craftsmen created treasures for the pharaohs. Master the ancient techniques of metalwork and jewelry.",
    difficulty: "junior",
    journeyLength: "medium",
    levelCount: 6,
    background: {
      time: "afternoon",
    },
    levelSettings: {
      startFloorCount: 4,
      endFloorCount: 5,
      startNumberRange: [1, 5],
      endNumberRange: [3, 10],
      blocksOpen: [0.8, 0.5],
    },
    rewards: {
      mapPiece: {
        startChance: 0.33,
        chanceIncrease: 0.15,
      },
      completed: {
        pieces: [3, 3],
      },
    },
  },
  {
    id: "junior_3",
    name: "Temple of Thoth",
    type: "pyramid",
    description:
      "Enter the temple of Thoth, god of wisdom and writing. Solve mathematical puzzles that test your understanding of ancient Egyptian numbers.",
    difficulty: "junior",
    journeyLength: "long",
    levelCount: 8,
    background: {
      time: "evening",
    },
    levelSettings: {
      startFloorCount: 5,
      blocksOpen: [0.8, 1],
      startNumberRange: [2, 6],
      endNumberRange: [4, 10],
    },
    rewards: {
      mapPiece: {
        startChance: 0.33,
        chanceIncrease: 0.15,
      },
      completed: {
        pieces: [3, 4],
      },
    },
  },
  {
    id: "junior_4",
    name: "Lighthouse of Alexandria",
    type: "pyramid",
    description:
      "Climb the legendary lighthouse of Alexandria, one of the Seven Wonders. Navigate the mathematical principles that made this marvel possible.",
    difficulty: "junior",
    journeyLength: "medium",
    levelCount: 5,
    background: {
      time: "night",
      showNile: true,
    },
    levelSettings: {
      startFloorCount: 5,
      blocksOpen: [0.8, 1],
      startNumberRange: [2, 10],
      endNumberRange: [5, 20],
    },
    rewards: {
      mapPiece: {
        startChance: 0.3,
        chanceIncrease: 0.18,
      },
      completed: {
        pieces: [3, 3],
      },
    },
  },

  // Junior Treasure Tomb Journey
  {
    id: "junior_treasure_tomb",
    name: "Noble's Hidden Vault",
    type: "treasure_tomb",
    description:
      "Explore the secret vault of a wealthy Egyptian noble, filled with golden artifacts and precious gemstones hidden from grave robbers.",
    difficulty: "junior",
    journeyLength: "medium",
    levelCount: 3,
    treasures: nobleVaultTreasures,
    levelSettings: {
      numberRange: [1, 10],
      operators: ["+", "-"],
      compareAmount: 2,
    },
  },

  // Expert Difficulty Journeys
  {
    id: "expert_1",
    name: "Valley of the Kings",
    type: "pyramid",
    description:
      "Explore the royal necropolis where pharaohs rest for eternity. Navigate through elaborate tomb chambers filled with ancient puzzles.",
    difficulty: "expert",
    journeyLength: "short",
    levelCount: 4,
    background: {
      time: "morning",
    },
    levelSettings: {
      startFloorCount: 5,
      endFloorCount: 6,
      blocksOpen: [0.8, 0.6],
      blocksBlocked: [1, 1],
      startNumberRange: [2, 7],
      endNumberRange: [4, 12],
    },
    rewards: {
      mapPiece: {
        startChance: 0.5,
        chanceIncrease: 0.25,
      },
      completed: {
        pieces: [3, 4],
      },
    },
  },
  {
    id: "expert_2",
    name: "Karnak Temple Complex",
    type: "pyramid",
    description:
      "Venture through the vast temple complex of Karnak, dedicated to Amun-Ra. Solve the riddles left by high priests across centuries.",
    difficulty: "expert",
    journeyLength: "medium",
    levelCount: 6,
    background: {
      time: "afternoon",
      timeStepSize: 2,
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 5,
      blocksOpen: [0.9, 0.5],
      blocksBlocked: [0.3, 0.5],
      startNumberRange: [2, 7],
      endNumberRange: [4, 12],
    },
    rewards: {
      mapPiece: {
        startChance: 0.33,
        chanceIncrease: 0.15,
      },
      completed: {
        pieces: [4, 4],
      },
    },
  },
  {
    id: "expert_3",
    name: "Nile Delta Expedition",
    type: "pyramid",
    description:
      "Journey through the fertile Nile Delta, encountering crocodile gods and solving the mysteries of the river's annual flood.",
    difficulty: "expert",
    journeyLength: "long",
    levelCount: 9,
    background: {
      time: "evening",
      timeStepSize: 1,
      showNile: true,
    },
    levelSettings: {
      startFloorCount: 5,
      endFloorCount: 6,
      blocksOpen: [0.6, 0.8],
      blocksBlocked: [0.5, 0.5],
      startNumberRange: [3, 8],
      endNumberRange: [5, 15],
    },
    rewards: {
      mapPiece: {
        startChance: 0.22,
        chanceIncrease: 0.1,
      },
      completed: {
        pieces: [4, 5],
      },
    },
  },
  {
    id: "expert_4",
    name: "Pyramid of Djoser",
    type: "pyramid",
    description:
      "Ascend the step pyramid of Djoser, the first pyramid ever built. Face the challenges that have protected this monument for millennia.",
    difficulty: "expert",
    journeyLength: "medium",
    levelCount: 7,
    background: {
      time: "night",
    },
    levelSettings: {
      startFloorCount: 6,
      blocksOpen: [0.6, 0.6],
      blocksBlocked: [0.3, 0.5],
      startNumberRange: [3, 8],
      endNumberRange: [5, 15],
    },
    rewards: {
      mapPiece: {
        startChance: 0.29,
        chanceIncrease: 0.12,
      },
      completed: {
        pieces: [4, 4],
      },
    },
  },

  // Expert Treasure Tomb Journey
  {
    id: "expert_treasure_tomb",
    name: "High Priest's Treasury",
    type: "treasure_tomb",
    description:
      "Infiltrate the elaborate underground treasury of a powerful high priest, where sacred relics and divine artifacts await the worthy.",
    difficulty: "expert",
    journeyLength: "medium",
    levelCount: 4,
    treasures: templeSecretsTreasures,
    levelSettings: {
      numberRange: [1, 10],
      operators: ["+", "-", "*"],
      compareAmount: 3,
    },
  },

  // Master Difficulty Journeys
  {
    id: "master_1",
    name: "Great Pyramid of Giza",
    type: "pyramid",
    description:
      "Enter the most magnificent pyramid ever built. Face the ultimate test as you navigate the Grand Gallery and reach the King's Chamber.",
    difficulty: "master",
    journeyLength: "short",
    levelCount: 4,
    background: {
      time: "morning",
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 7,
      blocksBlocked: [0.5, 1.0],
      startNumberRange: [4, 10],
      endNumberRange: [7, 18],
    },
    rewards: {
      mapPiece: {
        startChance: 0.1,
        chanceIncrease: 0.25,
      },
      completed: {
        pieces: [4, 5],
      },
    },
  },
  {
    id: "master_2",
    name: "Book of the Dead",
    type: "pyramid",
    description:
      "Unravel the mysteries of the afterlife by collecting and deciphering the sacred texts that guide souls through the underworld.",
    difficulty: "master",
    journeyLength: "long",
    levelCount: 9,
    background: {
      time: "evening",
      timeStepSize: 1,
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 6,
      blocksBlocked: [0.5, 1.0],
      startNumberRange: [4, 10],
      endNumberRange: [8, 20],
    },
    rewards: {
      mapPiece: {
        startChance: 0.13,
        chanceIncrease: 0.15,
      },
      completed: {
        pieces: [5, 6],
      },
    },
  },
  {
    id: "master_3",
    name: "Curse of the Pharaohs",
    type: "pyramid",
    description:
      "Break the ancient curse that has plagued tomb raiders for centuries. Face supernatural challenges and divine retribution.",
    difficulty: "master",
    journeyLength: "long",
    levelCount: 8,
    background: {
      time: "night",
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 7,
      blocksBlocked: [0.5, 1.0],
      startNumberRange: [5, 12],
      endNumberRange: [8, 22],
    },
    rewards: {
      mapPiece: {
        startChance: 0.15,
        chanceIncrease: 0.12,
      },
      completed: {
        pieces: [5, 6],
      },
    },
  },
  {
    id: "master_4",
    name: "Tomb of Nefertari",
    type: "pyramid",
    description:
      "Enter the most beautifully decorated tomb in the Valley of the Queens. Solve puzzles based on the stunning wall paintings and hieroglyphs.",
    difficulty: "master",
    journeyLength: "medium",
    levelCount: 5,
    background: {
      time: "night",
      timeStepSize: 1,
    },
    levelSettings: {
      startFloorCount: 7,
      endFloorCount: 7,
      blocksBlocked: [0.5, 1.0],
      startNumberRange: [5, 12],
      endNumberRange: [9, 20],
    },
    rewards: {
      mapPiece: {
        startChance: 0.1,
        chanceIncrease: 0.18,
      },
      completed: {
        pieces: [5, 5],
      },
    },
  },

  // Master Treasure Tomb Journey
  {
    id: "master_treasure_tomb",
    name: "Pharaoh's Secret Hoard",
    type: "treasure_tomb",
    description:
      "Uncover the legendary secret treasure chamber of a great pharaoh, hidden beneath the desert sands and protected by ancient curses.",
    difficulty: "master",
    journeyLength: "long",
    levelCount: 5,
    treasures: ancientRelicsTreasures,
    levelSettings: {
      numberRange: [1, 10],
      operators: ["+", "-", "*", "/"],
      compareAmount: 4,
    },
  },

  // Wizard Difficulty Journeys
  {
    id: "wizard_1",
    name: "Ra's Solar Journey",
    type: "pyramid",
    description:
      "Accompany Ra on his perilous nightly journey through the underworld, battling the serpent Apep and ensuring the sun rises again.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 9,
    background: {
      time: "morning",
    },
    levelSettings: {
      startFloorCount: 7,
      endFloorCount: 8,
      blocksOpen: [1, 0.6],
      blocksOpenRestricted: [3],
      blocksBlocked: [0.5, 1.0],
      blocksBlockedRestricted: [0, 1, 2, 4, 5, 6, 7, 8],
      startNumberRange: [6, 15],
      endNumberRange: [10, 25],
    },
    rewards: {
      mapPiece: {
        startChance: 0.67,
        chanceIncrease: 0.2,
      },
      completed: {
        pieces: [6, 7],
      },
    },
  },
  {
    id: "wizard_2",
    name: "Secrets of the Sphinx",
    type: "pyramid",
    description:
      "Unlock the deepest mysteries hidden within the Great Sphinx. Face riddles that have challenged the greatest minds for millennia.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 11,
    background: {
      time: "afternoon",
    },
    levelSettings: {
      startFloorCount: 5,
      endFloorCount: 10,
      blocksOpen: [1, 0.6],
      blocksOpenRestricted: [9, 8, 7, 6],
      blocksBlocked: [0.5, 1.0],
      blocksBlockedRestricted: [0, 1],
      startNumberRange: [7, 16],
      endNumberRange: [12, 28],
    },
    rewards: {
      mapPiece: {
        startChance: 0.29,
        chanceIncrease: 0.12,
      },
      completed: {
        pieces: [6, 7],
      },
    },
  },
  {
    id: "wizard_3",
    name: "Chamber of Ma'at",
    type: "pyramid",
    description:
      "Enter the cosmic chamber where Ma'at weighs the hearts of the dead. Balance divine mathematics in the realm of perfect justice.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 10,
    background: {
      time: "evening",
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 8,
      blocksBlocked: [0.5, 1.0],
      blocksBlockedRestricted: [0, 1],
      startNumberRange: [1, 9],
      endNumberRange: [3, 14],
    },
    rewards: {
      mapPiece: {
        startChance: 0.2,
        chanceIncrease: 0.1,
      },
      completed: {
        pieces: [6, 7],
      },
    },
  },
  {
    id: "wizard_4",
    name: "Eternal Pyramid",
    type: "pyramid",
    description:
      "Ascend the mythical Eternal Pyramid that exists beyond time and space. Master the ultimate mathematical mysteries of creation itself.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 8,
    background: {
      time: "night",
    },
    levelSettings: {
      startFloorCount: 10,
      endFloorCount: 10,
      blocksOpen: [0.5, 0.7],
      blocksBlocked: [0.5, 1.0],
      blocksBlockedRestricted: [0, 1],
      startNumberRange: [10, 20],
      endNumberRange: [4, 19],
    },
    rewards: {
      mapPiece: {
        startChance: 0.15,
        chanceIncrease: 0.12,
      },
      completed: {
        pieces: [6, 7],
      },
    },
  },

  // Wizard Treasure Tomb Journey
  {
    id: "wizard_treasure_tomb",
    name: "Vault of the Gods",
    type: "treasure_tomb",
    description:
      "Enter the mythical treasure vault where the gods themselves stored their most precious artifacts. Only the most skilled adventurers dare attempt this ultimate treasure hunt.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 6,
    treasures: mythicalArtifactsTreasures,
    levelSettings: {
      numberRange: [1, 15],
      operators: ["+", "-", "*", "/"],
      compareAmount: 5,
    },
  },
]
