import type { DayNightCycleStep } from "@/ui/atoms/backdropSelection"
import type { Difficulty } from "./difficultyLevels"
import type { SiteConfig } from "@/game/siteTypes"
import { generatedWorldConfigs } from "./generatedWorld"
import { PYRAMID_STRUCTURES, TOMB_STRUCTURES } from "./journeyStructure"

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
  // Which exterior this journey wears. Art and copy only: a tomb's interior is a pyramid interior,
  // takes the same authoring, and is entered through the same expedition flow.
  exterior: "pyramid" | "tomb"
  difficulty: Difficulty
  journeyLength: "short" | "medium" | "long"
  // Nodes on the journey's map, one per generated site — not authored, so the map can never draw a
  // node the world has no site for.
  levelCount: number
  background: {
    time: DayNightCycleStep
    timeStepSize?: number
    showNile?: boolean
  }
  // The cross-sum board each of this journey's sites is entered through.
  levelSettings: {
    startFloorCount: number
    endFloorCount?: number
    blocksOpen?: [minPercentage: number, maxPercentage: number]
    blocksOpenRestricted?: number[] // Blocking of specific floors for opening blocks
    blocksBlocked?: [minPercentage: number, maxPercentage: number]
    blocksBlockedRestricted?: number[] // Blocking of specific floors for blocking blocks
    startNumberRange: [min: number, max: number]
    useMultiplesOf?: [min: number, max: number]
    endNumberRange?: [min: number, max: number]
  }
  // How much of some currency must be held before this journey can be entered. Whichever mod owns
  // that currency says which one it is and reports the progress (app/pages/journeyContributions.ts);
  // core only knows a count has to be reached.
  entryLock?: { count: number }
  siteConfigs?: SiteConfig[]
}

// A journey as journeys.ts writes it: everything except what the generated world decides.
type AuthoredJourney = Omit<Journey, "levelCount" | "siteConfigs">

const authoredJourneys: AuthoredJourney[] = [
  // Starter Difficulty Journeys
  {
    id: "starter_1",
    name: "Dawn at the Sphinx",
    exterior: "pyramid",
    description:
      "Begin your adventure with the Great Sphinx as the morning sun illuminates its ancient face. A gentle introduction to the mysteries of Egypt.",
    difficulty: "starter",
    journeyLength: "short",
    background: {
      time: "morning",
    },
    levelSettings: {
      startFloorCount: 3,
      blocksOpenRestricted: [0], // no blocks opening at bottom floor
      blocksOpen: [0.5, 1],
      startNumberRange: [1, 3],
    },
  },
  {
    id: "starter_2",
    name: "Papyrus Merchant's Route",
    exterior: "pyramid",
    description:
      "Follow the trade routes of ancient papyrus merchants along the peaceful banks of the Nile. Discover the secrets of Egyptian commerce.",
    difficulty: "starter",
    journeyLength: "short",
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
  },
  {
    id: "starter_3",
    name: "Temple of Bastet",
    exterior: "pyramid",
    description:
      "Visit the sacred temple of the cat goddess Bastet, where faithful worshippers bring offerings and seek protection from evil spirits.",
    difficulty: "starter",
    journeyLength: "medium",
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
  },
  {
    id: "starter_4",
    name: "Scribe's Academy",
    exterior: "pyramid",
    description:
      "Learn the art of hieroglyphic writing in the prestigious scribe's academy, where knowledge is more valuable than gold.",
    difficulty: "starter",
    journeyLength: "medium",
    background: {
      time: "night",
    },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [1, 7],
      endNumberRange: [2, 9],
      useMultiplesOf: [2, 3],
    },
  },

  // Starter Treasure Tomb Journey
  {
    id: "starter_treasure_tomb",
    name: "Forgotten Merchant's Cache",
    exterior: "tomb",
    description:
      "Discover a small underground chamber where an ancient merchant hid his precious goods. A perfect introduction to treasure hunting.",
    difficulty: "starter",
    journeyLength: "short",
    entryLock: { count: 4 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 3,
      startNumberRange: [1, 6],
    },
  },

  // Junior Difficulty Journeys
  {
    id: "junior_1",
    name: "Sacred Ibis Migration",
    exterior: "pyramid",
    description:
      "Follow the sacred ibis birds on their annual migration along the Nile. Learn the patterns that ancient Egyptians used to predict the flood.",
    difficulty: "junior",
    journeyLength: "short",
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
  },
  {
    id: "junior_2",
    name: "Valley of the Artisans",
    exterior: "pyramid",
    description:
      "Explore the village where skilled craftsmen created treasures for the pharaohs. Master the ancient techniques of metalwork and jewelry.",
    difficulty: "junior",
    journeyLength: "medium",
    background: {
      time: "afternoon",
    },
    levelSettings: {
      startFloorCount: 4,
      endFloorCount: 5,
      startNumberRange: [1, 15],
      endNumberRange: [3, 20],
      useMultiplesOf: [2, 5],
      blocksOpen: [0.8, 0.5],
    },
  },
  {
    id: "junior_3",
    name: "Temple of Thoth",
    exterior: "pyramid",
    description:
      "Enter the temple of Thoth, god of wisdom and writing. Solve mathematical puzzles that test your understanding of ancient Egyptian numbers.",
    difficulty: "junior",
    journeyLength: "long",
    background: {
      time: "evening",
    },
    levelSettings: {
      startFloorCount: 5,
      blocksOpen: [0.8, 1],
      startNumberRange: [2, 6],
      endNumberRange: [4, 10],
    },
  },
  {
    id: "junior_4",
    name: "Lighthouse of Alexandria",
    exterior: "pyramid",
    description:
      "Climb the legendary lighthouse of Alexandria, one of the Seven Wonders. Navigate the mathematical principles that made this marvel possible.",
    difficulty: "junior",
    journeyLength: "medium",
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
  },

  // Junior Treasure Tomb Journey
  {
    id: "junior_treasure_tomb",
    name: "Noble's Hidden Vault",
    exterior: "tomb",
    description:
      "Explore the secret vault of a wealthy Egyptian noble, filled with golden artifacts and precious gemstones hidden from grave robbers.",
    difficulty: "junior",
    journeyLength: "medium",
    entryLock: { count: 4 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 3,
      startNumberRange: [1, 10],
    },
  },

  // Expert Difficulty Journeys
  {
    id: "expert_1",
    name: "Valley of the Kings",
    exterior: "pyramid",
    description:
      "Explore the royal necropolis where pharaohs rest for eternity. Navigate through elaborate tomb chambers filled with ancient puzzles.",
    difficulty: "expert",
    journeyLength: "short",
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
  },
  {
    id: "expert_2",
    name: "Karnak Temple Complex",
    exterior: "pyramid",
    description:
      "Venture through the vast temple complex of Karnak, dedicated to Amun-Ra. Solve the riddles left by high priests across centuries.",
    difficulty: "expert",
    journeyLength: "medium",
    background: {
      time: "afternoon",
      timeStepSize: 2,
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 5,
      blocksOpen: [0.9, 0.5],
      blocksBlocked: [0.3, 0.5],
      startNumberRange: [2, 16],
      endNumberRange: [4, 16],
      useMultiplesOf: [3, 7],
    },
  },
  {
    id: "expert_3",
    name: "Nile Delta Expedition",
    exterior: "pyramid",
    description:
      "Journey through the fertile Nile Delta, encountering crocodile gods and solving the mysteries of the river's annual flood.",
    difficulty: "expert",
    journeyLength: "long",
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
  },
  {
    id: "expert_4",
    name: "Pyramid of Djoser",
    exterior: "pyramid",
    description:
      "Ascend the step pyramid of Djoser, the first pyramid ever built. Face the challenges that have protected this monument for millennia.",
    difficulty: "expert",
    journeyLength: "medium",
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
  },

  // Expert Treasure Tomb Journeys
  {
    id: "expert_treasure_tomb",
    name: "High Priest's Treasury",
    exterior: "tomb",
    description:
      "Infiltrate the elaborate underground treasury of a powerful high priest, where sacred relics and divine artifacts await the worthy.",
    difficulty: "expert",
    journeyLength: "short",
    entryLock: { count: 4 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [1, 10],
    },
  },
  {
    id: "expert_treasure_tomb_b",
    name: "Inner Sanctum",
    exterior: "tomb",
    description:
      "Breach the sealed inner sanctum where only the highest priests dared tread, guarding the most sacred artifacts of the temple.",
    difficulty: "expert",
    journeyLength: "short",
    entryLock: { count: 3 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [2, 12],
    },
  },

  // Master Difficulty Journeys
  {
    id: "master_1",
    name: "Great Pyramid of Giza",
    exterior: "pyramid",
    description:
      "Enter the most magnificent pyramid ever built. Face the ultimate test as you navigate the Grand Gallery and reach the King's Chamber.",
    difficulty: "master",
    journeyLength: "short",
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
  },
  {
    id: "master_2",
    name: "Book of the Dead",
    exterior: "pyramid",
    description:
      "Unravel the mysteries of the afterlife by collecting and deciphering the sacred texts that guide souls through the underworld.",
    difficulty: "master",
    journeyLength: "long",
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
  },
  {
    id: "master_3",
    name: "Curse of the Pharaohs",
    exterior: "pyramid",
    description:
      "Break the ancient curse that has plagued tomb raiders for centuries. Face supernatural challenges and divine retribution.",
    difficulty: "master",
    journeyLength: "long",
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
  },
  {
    id: "master_4",
    name: "Tomb of Nefertari",
    exterior: "pyramid",
    description:
      "Enter the most beautifully decorated tomb in the Valley of the Queens. Solve puzzles based on the stunning wall paintings and hieroglyphs.",
    difficulty: "master",
    journeyLength: "medium",
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
  },

  // Master Treasure Tomb Journeys
  {
    id: "master_treasure_tomb",
    name: "Hall of Ma'at",
    exterior: "tomb",
    description:
      "Enter the hall where the goddess Ma'at weighs the hearts of the dead. Prove your worth through perfect balance and divine justice.",
    difficulty: "master",
    journeyLength: "medium",
    entryLock: { count: 4 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [1, 10],
    },
  },
  {
    id: "master_treasure_tomb_b",
    name: "Hall of Osiris",
    exterior: "tomb",
    description:
      "Descend into the deeper hall ruled by Osiris, lord of the underworld. Face the mysteries of death and rebirth to claim his ancient relics.",
    difficulty: "master",
    journeyLength: "medium",
    entryLock: { count: 3 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 4,
      startNumberRange: [1, 12],
    },
  },

  // Wizard Difficulty Journeys
  {
    id: "wizard_1",
    name: "Ra's Solar Journey",
    exterior: "pyramid",
    description:
      "Accompany Ra on his perilous nightly journey through the underworld, battling the serpent Apep and ensuring the sun rises again.",
    difficulty: "wizard",
    journeyLength: "long",
    background: {
      time: "night",
      timeStepSize: 1,
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
  },
  {
    id: "wizard_2",
    name: "Secrets of the Sphinx",
    exterior: "pyramid",
    description:
      "Unlock the deepest mysteries hidden within the Great Sphinx. Face riddles that have challenged the greatest minds for millennia.",
    difficulty: "wizard",
    journeyLength: "long",
    background: {
      time: "afternoon",
      timeStepSize: 1,
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
  },
  {
    id: "wizard_3",
    name: "Chamber of Ma'at",
    exterior: "pyramid",
    description:
      "Enter the cosmic chamber where Ma'at weighs the hearts of the dead. Balance divine mathematics in the realm of perfect justice.",
    difficulty: "wizard",
    journeyLength: "long",
    background: {
      time: "evening",
      timeStepSize: 1,
    },
    levelSettings: {
      startFloorCount: 6,
      endFloorCount: 8,
      blocksBlocked: [0.5, 1.0],
      blocksBlockedRestricted: [0, 1],
      startNumberRange: [1, 9],
      endNumberRange: [3, 14],
    },
  },
  {
    id: "wizard_4",
    name: "Eternal Pyramid",
    exterior: "pyramid",
    description:
      "Ascend the mythical Eternal Pyramid that exists beyond time and space. Master the ultimate mathematical mysteries of creation itself.",
    difficulty: "wizard",
    journeyLength: "long",
    background: {
      time: "night",
      timeStepSize: 1,
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
  },

  // Wizard Treasure Tomb Journeys
  {
    id: "wizard_treasure_tomb",
    name: "Vault of the Gods",
    exterior: "tomb",
    description:
      "Enter the mythical treasure vault where the gods themselves stored their most precious artifacts. Only the most skilled adventurers dare attempt this ultimate treasure hunt.",
    difficulty: "wizard",
    journeyLength: "medium",
    entryLock: { count: 4 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 5,
      startNumberRange: [1, 15],
    },
  },
  {
    id: "wizard_treasure_tomb_b",
    name: "Realm of Cosmic Forces",
    exterior: "tomb",
    description:
      "Venture deeper into the divine realm where cosmic forces of life, death, chaos, and wind manifest as ancient relics of immeasurable power.",
    difficulty: "wizard",
    journeyLength: "medium",
    entryLock: { count: 3 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 5,
      startNumberRange: [2, 18],
    },
  },
  {
    id: "wizard_treasure_tomb_c",
    name: "Throne of Eternity",
    exterior: "tomb",
    description:
      "Reach the innermost sanctum of the divine realm — the Throne of Eternity where the gods themselves rest. Only the greatest mathematicians of all time have stood here.",
    difficulty: "wizard",
    journeyLength: "medium",
    entryLock: { count: 2 },
    background: { time: "night" },
    levelSettings: {
      startFloorCount: 5,
      startNumberRange: [3, 20],
    },
  },
]

// Every journey is declared in journeyStructure.ts too, which is what world-gen builds from; a
// journey missing there would generate no sites at all. Its levelCount is world-gen's own input (a
// pyramid journey's site count, a tomb's floors within its one site), so the map takes its node
// count from the generated world instead, and cannot draw a node with no site behind it.
const allStructures = [...PYRAMID_STRUCTURES, ...TOMB_STRUCTURES]

export const journeys: Journey[] = authoredJourneys.map(journey => {
  const structure = allStructures.find(s => s.id === journey.id)
  if (!structure) throw new Error(`Journey "${journey.id}" not found in journeyStructure — update journeyStructure.ts`)
  const config = generatedWorldConfigs[journey.id]
  // No config means the world has not been generated (yarn generate-world); fall back to world-gen's
  // own input so the screens still have something to draw.
  return { ...journey, levelCount: config?.length ?? structure.levelCount, siteConfigs: config }
})
