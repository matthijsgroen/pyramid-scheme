export type Journey = {
  id: string
  name: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  journeyLength: "short" | "medium" | "long"
  levelCount: number
  time: "morning" | "afternoon" | "evening" | "night"
  requiredPrestigeLevel: number
  rewards: {
    perLevel: {
      coinsPerLevel: [min: number, max: number]
    }
    completed: {
      pieces: [min: number, max: number]
      pieceLevels: [min: number, max: number]
    }
  }
}

export const journeys: Journey[] = [
  // Easy Difficulty Journeys
  {
    id: "easy_1",
    name: "Dawn at the Sphinx",
    description:
      "Begin your adventure with the Great Sphinx as the morning sun illuminates its ancient face. A gentle introduction to the mysteries of Egypt.",
    difficulty: "easy",
    journeyLength: "short",
    levelCount: 5,
    time: "morning",
    requiredPrestigeLevel: 0,
    rewards: {
      perLevel: {
        coinsPerLevel: [10, 25],
      },
      completed: {
        pieces: [1, 2],
        pieceLevels: [1, 2],
      },
    },
  },
  {
    id: "easy_2",
    name: "Papyrus Merchant's Route",
    description:
      "Follow the trade routes of ancient papyrus merchants along the peaceful banks of the Nile. Discover the secrets of Egyptian commerce.",
    difficulty: "easy",
    journeyLength: "short",
    levelCount: 6,
    time: "afternoon",
    requiredPrestigeLevel: 1,
    rewards: {
      perLevel: {
        coinsPerLevel: [15, 30],
      },
      completed: {
        pieces: [1, 2],
        pieceLevels: [1, 3],
      },
    },
  },
  {
    id: "easy_3",
    name: "Temple of Bastet",
    description:
      "Visit the sacred temple of the cat goddess Bastet, where faithful worshippers bring offerings and seek protection from evil spirits.",
    difficulty: "easy",
    journeyLength: "medium",
    levelCount: 8,
    time: "evening",
    requiredPrestigeLevel: 2,
    rewards: {
      perLevel: {
        coinsPerLevel: [20, 35],
      },
      completed: {
        pieces: [2, 3],
        pieceLevels: [2, 4],
      },
    },
  },
  {
    id: "easy_4",
    name: "Scribe's Academy",
    description:
      "Learn the art of hieroglyphic writing in the prestigious scribe's academy, where knowledge is more valuable than gold.",
    difficulty: "easy",
    journeyLength: "medium",
    levelCount: 10,
    time: "morning",
    requiredPrestigeLevel: 3,
    rewards: {
      perLevel: {
        coinsPerLevel: [25, 40],
      },
      completed: {
        pieces: [2, 3],
        pieceLevels: [2, 5],
      },
    },
  },

  // Medium Difficulty Journeys
  {
    id: "medium_1",
    name: "Valley of the Kings",
    description:
      "Explore the royal necropolis where pharaohs rest for eternity. Navigate through elaborate tomb chambers filled with ancient puzzles.",
    difficulty: "medium",
    journeyLength: "medium",
    levelCount: 12,
    time: "afternoon",
    requiredPrestigeLevel: 0,
    rewards: {
      perLevel: {
        coinsPerLevel: [30, 50],
      },
      completed: {
        pieces: [3, 4],
        pieceLevels: [3, 6],
      },
    },
  },
  {
    id: "medium_2",
    name: "Karnak Temple Complex",
    description:
      "Venture through the vast temple complex of Karnak, dedicated to Amun-Ra. Solve the riddles left by high priests across centuries.",
    difficulty: "medium",
    journeyLength: "long",
    levelCount: 15,
    time: "morning",
    requiredPrestigeLevel: 4,
    rewards: {
      perLevel: {
        coinsPerLevel: [40, 60],
      },
      completed: {
        pieces: [3, 5],
        pieceLevels: [4, 7],
      },
    },
  },
  {
    id: "medium_3",
    name: "Nile Delta Expedition",
    description:
      "Journey through the fertile Nile Delta, encountering crocodile gods and solving the mysteries of the river's annual flood.",
    difficulty: "medium",
    journeyLength: "long",
    levelCount: 18,
    time: "evening",
    requiredPrestigeLevel: 6,
    rewards: {
      perLevel: {
        coinsPerLevel: [50, 70],
      },
      completed: {
        pieces: [4, 6],
        pieceLevels: [5, 8],
      },
    },
  },
  {
    id: "medium_4",
    name: "Pyramid of Djoser",
    description:
      "Ascend the step pyramid of Djoser, the first pyramid ever built. Face the challenges that have protected this monument for millennia.",
    difficulty: "medium",
    journeyLength: "long",
    levelCount: 20,
    time: "night",
    requiredPrestigeLevel: 8,
    rewards: {
      perLevel: {
        coinsPerLevel: [60, 80],
      },
      completed: {
        pieces: [4, 7],
        pieceLevels: [6, 9],
      },
    },
  },

  // Hard Difficulty Journeys
  {
    id: "hard_1",
    name: "Great Pyramid of Giza",
    description:
      "Enter the most magnificent pyramid ever built. Face the ultimate test as you navigate the Grand Gallery and reach the King's Chamber.",
    difficulty: "hard",
    journeyLength: "long",
    levelCount: 25,
    time: "night",
    requiredPrestigeLevel: 0,
    rewards: {
      perLevel: {
        coinsPerLevel: [70, 100],
      },
      completed: {
        pieces: [5, 8],
        pieceLevels: [7, 12],
      },
    },
  },
  {
    id: "hard_2",
    name: "Book of the Dead",
    description:
      "Unravel the mysteries of the afterlife by collecting and deciphering the sacred texts that guide souls through the underworld.",
    difficulty: "hard",
    journeyLength: "long",
    levelCount: 30,
    time: "night",
    requiredPrestigeLevel: 10,
    rewards: {
      perLevel: {
        coinsPerLevel: [90, 120],
      },
      completed: {
        pieces: [6, 10],
        pieceLevels: [8, 14],
      },
    },
  },
  {
    id: "hard_3",
    name: "Curse of the Pharaohs",
    description:
      "Break the ancient curse that has plagued tomb raiders for centuries. Face supernatural challenges and divine retribution.",
    difficulty: "hard",
    journeyLength: "long",
    levelCount: 35,
    time: "night",
    requiredPrestigeLevel: 15,
    rewards: {
      perLevel: {
        coinsPerLevel: [110, 150],
      },
      completed: {
        pieces: [7, 12],
        pieceLevels: [10, 16],
      },
    },
  },
  {
    id: "hard_4",
    name: "Ra's Solar Journey",
    description:
      "Accompany Ra on his perilous nightly journey through the underworld, battling the serpent Apep and ensuring the sun rises again.",
    difficulty: "hard",
    journeyLength: "long",
    levelCount: 40,
    time: "night",
    requiredPrestigeLevel: 20,
    rewards: {
      perLevel: {
        coinsPerLevel: [130, 180],
      },
      completed: {
        pieces: [8, 13],
        pieceLevels: [12, 20],
      },
    },
  },
]
