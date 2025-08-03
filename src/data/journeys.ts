import type { DayNightCycleStep } from "@/ui/backdropSelection"

/**
 * JourneyLength:
 * - short: 3-4 levels
 * - medium: 5-7 levels
 * - long: 7-10 levels
 */

export type Journey = {
  id: string
  name: string
  description: string
  difficulty: "starter" | "junior" | "expert" | "master" | "wizard"
  journeyLength: "short" | "medium" | "long"
  levelCount: number
  time: DayNightCycleStep
  levelSettings: {
    startFloorCount: number
    endFloorCount?: number
    startNumberRange: [min: number, max: number]
    endNumberRange?: [min: number, max: number]
  }
  rewards: {
    completed: {
      pieces: [min: number, max: number]
      pieceLevels: [min: number, max: number]
    }
  }
}

export const journeys: Journey[] = [
  // Starter Difficulty Journeys
  {
    id: "starter_1",
    name: "Dawn at the Sphinx",
    description:
      "Begin your adventure with the Great Sphinx as the morning sun illuminates its ancient face. A gentle introduction to the mysteries of Egypt.",
    difficulty: "starter",
    journeyLength: "short",
    levelCount: 3,
    time: "morning",
    levelSettings: {
      startFloorCount: 3,
      startNumberRange: [1, 3],
    },
    rewards: {
      completed: {
        pieces: [1, 2],
        pieceLevels: [1, 2],
      },
    },
  },
  {
    id: "starter_2",
    name: "Papyrus Merchant's Route",
    description:
      "Follow the trade routes of ancient papyrus merchants along the peaceful banks of the Nile. Discover the secrets of Egyptian commerce.",
    difficulty: "starter",
    journeyLength: "short",
    levelCount: 4,
    time: "afternoon",
    levelSettings: {
      startFloorCount: 3,
      endFloorCount: 4,
      startNumberRange: [1, 4],
      endNumberRange: [2, 5],
    },
    rewards: {
      completed: {
        pieces: [1, 2],
        pieceLevels: [1, 3],
      },
    },
  },
  {
    id: "starter_3",
    name: "Temple of Bastet",
    description:
      "Visit the sacred temple of the cat goddess Bastet, where faithful worshippers bring offerings and seek protection from evil spirits.",
    difficulty: "starter",
    journeyLength: "medium",
    levelCount: 5,
    time: "evening",
    levelSettings: {
      startFloorCount: 3,
      endFloorCount: 4,
      startNumberRange: [1, 4],
      endNumberRange: [3, 8],
    },
    rewards: {
      completed: {
        pieces: [2, 3],
        pieceLevels: [2, 4],
      },
    },
  },
  {
    id: "starter_4",
    name: "Scribe's Academy",
    description:
      "Learn the art of hieroglyphic writing in the prestigious scribe's academy, where knowledge is more valuable than gold.",
    difficulty: "starter",
    journeyLength: "long",
    levelCount: 7,
    time: "night",
    levelSettings: {
      startFloorCount: 4,
      endFloorCount: 5,
      startNumberRange: [1, 4],
      endNumberRange: [3, 10],
    },
    rewards: {
      completed: {
        pieces: [2, 4],
        pieceLevels: [2, 5],
      },
    },
  },

  // Junior Difficulty Journeys
  {
    id: "junior_1",
    name: "Sacred Ibis Migration",
    description:
      "Follow the sacred ibis birds on their annual migration along the Nile. Learn the patterns that ancient Egyptians used to predict the flood.",
    difficulty: "junior",
    journeyLength: "short",
    levelCount: 3,
    time: "morning",
    levelSettings: {
      startFloorCount: 4,
      endFloorCount: 5,
      startNumberRange: [1, 5],
      endNumberRange: [2, 8],
    },
    rewards: {
      completed: {
        pieces: [2, 3],
        pieceLevels: [3, 5],
      },
    },
  },
  {
    id: "junior_2",
    name: "Valley of the Artisans",
    description:
      "Explore the village where skilled craftsmen created treasures for the pharaohs. Master the ancient techniques of metalwork and jewelry.",
    difficulty: "junior",
    journeyLength: "medium",
    levelCount: 6,
    time: "afternoon",
    levelSettings: {
      startFloorCount: 5,
      endFloorCount: 6,
      startNumberRange: [1, 5],
      endNumberRange: [3, 10],
    },
    rewards: {
      completed: {
        pieces: [3, 4],
        pieceLevels: [3, 6],
      },
    },
  },
  {
    id: "junior_3",
    name: "Temple of Thoth",
    description:
      "Enter the temple of Thoth, god of wisdom and writing. Solve mathematical puzzles that test your understanding of ancient Egyptian numbers.",
    difficulty: "junior",
    journeyLength: "long",
    levelCount: 8,
    time: "evening",
    levelSettings: {
      startFloorCount: 5,
      endFloorCount: 7,
      startNumberRange: [2, 6],
      endNumberRange: [4, 12],
    },
    rewards: {
      completed: {
        pieces: [3, 5],
        pieceLevels: [4, 7],
      },
    },
  },
  {
    id: "junior_4",
    name: "Lighthouse of Alexandria",
    description:
      "Climb the legendary lighthouse of Alexandria, one of the Seven Wonders. Navigate the mathematical principles that made this marvel possible.",
    difficulty: "junior",
    journeyLength: "medium",
    levelCount: 5,
    time: "night",
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 7,
      startNumberRange: [2, 6],
      endNumberRange: [3, 10],
    },
    rewards: {
      completed: {
        pieces: [3, 5],
        pieceLevels: [4, 6],
      },
    },
  },

  // Expert Difficulty Journeys
  {
    id: "expert_1",
    name: "Valley of the Kings",
    description:
      "Explore the royal necropolis where pharaohs rest for eternity. Navigate through elaborate tomb chambers filled with ancient puzzles.",
    difficulty: "expert",
    journeyLength: "short",
    levelCount: 4,
    time: "morning",
    levelSettings: {
      startFloorCount: 7,
      endFloorCount: 8,
      startNumberRange: [2, 7],
      endNumberRange: [4, 12],
    },
    rewards: {
      completed: {
        pieces: [4, 6],
        pieceLevels: [5, 8],
      },
    },
  },
  {
    id: "expert_2",
    name: "Karnak Temple Complex",
    description:
      "Venture through the vast temple complex of Karnak, dedicated to Amun-Ra. Solve the riddles left by high priests across centuries.",
    difficulty: "expert",
    journeyLength: "medium",
    levelCount: 6,
    time: "afternoon",
    levelSettings: {
      startFloorCount: 8,
      endFloorCount: 9,
      startNumberRange: [3, 8],
      endNumberRange: [5, 14],
    },
    rewards: {
      completed: {
        pieces: [4, 7],
        pieceLevels: [6, 9],
      },
    },
  },
  {
    id: "expert_3",
    name: "Nile Delta Expedition",
    description:
      "Journey through the fertile Nile Delta, encountering crocodile gods and solving the mysteries of the river's annual flood.",
    difficulty: "expert",
    journeyLength: "long",
    levelCount: 9,
    time: "evening",
    levelSettings: {
      startFloorCount: 8,
      endFloorCount: 10,
      startNumberRange: [3, 8],
      endNumberRange: [5, 15],
    },
    rewards: {
      completed: {
        pieces: [5, 8],
        pieceLevels: [7, 11],
      },
    },
  },
  {
    id: "expert_4",
    name: "Pyramid of Djoser",
    description:
      "Ascend the step pyramid of Djoser, the first pyramid ever built. Face the challenges that have protected this monument for millennia.",
    difficulty: "expert",
    journeyLength: "medium",
    levelCount: 7,
    time: "night",
    levelSettings: {
      startFloorCount: 9,
      endFloorCount: 10,
      startNumberRange: [3, 8],
      endNumberRange: [6, 16],
    },
    rewards: {
      completed: {
        pieces: [5, 8],
        pieceLevels: [7, 10],
      },
    },
  },

  // Master Difficulty Journeys
  {
    id: "master_1",
    name: "Great Pyramid of Giza",
    description:
      "Enter the most magnificent pyramid ever built. Face the ultimate test as you navigate the Grand Gallery and reach the King's Chamber.",
    difficulty: "master",
    journeyLength: "short",
    levelCount: 4,
    time: "morning",
    levelSettings: {
      startFloorCount: 10,
      endFloorCount: 12,
      startNumberRange: [4, 10],
      endNumberRange: [7, 18],
    },
    rewards: {
      completed: {
        pieces: [6, 9],
        pieceLevels: [8, 12],
      },
    },
  },
  {
    id: "master_2",
    name: "Book of the Dead",
    description:
      "Unravel the mysteries of the afterlife by collecting and deciphering the sacred texts that guide souls through the underworld.",
    difficulty: "master",
    journeyLength: "medium",
    levelCount: 6,
    time: "afternoon",
    levelSettings: {
      startFloorCount: 11,
      endFloorCount: 13,
      startNumberRange: [4, 10],
      endNumberRange: [8, 20],
    },
    rewards: {
      completed: {
        pieces: [7, 11],
        pieceLevels: [9, 14],
      },
    },
  },
  {
    id: "master_3",
    name: "Curse of the Pharaohs",
    description:
      "Break the ancient curse that has plagued tomb raiders for centuries. Face supernatural challenges and divine retribution.",
    difficulty: "master",
    journeyLength: "long",
    levelCount: 8,
    time: "evening",
    levelSettings: {
      startFloorCount: 12,
      endFloorCount: 14,
      startNumberRange: [5, 12],
      endNumberRange: [8, 22],
    },
    rewards: {
      completed: {
        pieces: [8, 12],
        pieceLevels: [10, 16],
      },
    },
  },
  {
    id: "master_4",
    name: "Tomb of Nefertari",
    description:
      "Enter the most beautifully decorated tomb in the Valley of the Queens. Solve puzzles based on the stunning wall paintings and hieroglyphs.",
    difficulty: "master",
    journeyLength: "medium",
    levelCount: 5,
    time: "night",
    levelSettings: {
      startFloorCount: 13,
      endFloorCount: 14,
      startNumberRange: [5, 12],
      endNumberRange: [9, 20],
    },
    rewards: {
      perLevel: {
        coinsPerLevel: [130, 170],
      },
      completed: {
        pieces: [7, 11],
        pieceLevels: [10, 15],
      },
    },
  },

  // Wizard Difficulty Journeys
  {
    id: "wizard_1",
    name: "Ra's Solar Journey",
    description:
      "Accompany Ra on his perilous nightly journey through the underworld, battling the serpent Apep and ensuring the sun rises again.",
    difficulty: "wizard",
    journeyLength: "short",
    levelCount: 3,
    time: "morning",
    levelSettings: {
      startFloorCount: 12,
      endFloorCount: 14,
      startNumberRange: [6, 15],
      endNumberRange: [10, 25],
    },
    rewards: {
      completed: {
        pieces: [10, 15],
        pieceLevels: [12, 18],
      },
    },
  },
  {
    id: "wizard_2",
    name: "Secrets of the Sphinx",
    description:
      "Unlock the deepest mysteries hidden within the Great Sphinx. Face riddles that have challenged the greatest minds for millennia.",
    difficulty: "wizard",
    journeyLength: "medium",
    levelCount: 7,
    time: "afternoon",
    levelSettings: {
      startFloorCount: 13,
      endFloorCount: 15,
      startNumberRange: [7, 16],
      endNumberRange: [12, 28],
    },
    rewards: {
      perLevel: {
        coinsPerLevel: [180, 240],
      },
      completed: {
        pieces: [12, 18],
        pieceLevels: [14, 20],
      },
    },
  },
  {
    id: "wizard_3",
    name: "Chamber of Ma'at",
    description:
      "Enter the cosmic chamber where Ma'at weighs the hearts of the dead. Balance divine mathematics in the realm of perfect justice.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 10,
    time: "evening",
    levelSettings: {
      startFloorCount: 14,
      endFloorCount: 15,
      startNumberRange: [8, 18],
      endNumberRange: [14, 30],
    },
    rewards: {
      completed: {
        pieces: [15, 22],
        pieceLevels: [16, 25],
      },
    },
  },
  {
    id: "wizard_4",
    name: "Eternal Pyramid",
    description:
      "Ascend the mythical Eternal Pyramid that exists beyond time and space. Master the ultimate mathematical mysteries of creation itself.",
    difficulty: "wizard",
    journeyLength: "long",
    levelCount: 8,
    time: "night",
    levelSettings: {
      startFloorCount: 15,
      endFloorCount: 15,
      startNumberRange: [10, 20],
      endNumberRange: [15, 35],
    },
    rewards: {
      completed: {
        pieces: [18, 25],
        pieceLevels: [18, 30],
      },
    },
  },
]
