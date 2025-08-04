import type { Meta, StoryObj } from "@storybook/react"
import { JourneyCard } from "./JourneyCard"
import type { TranslatedJourney } from "@/data/useJourneyTranslations"

// Mock journey data
const mockPyramidJourney: TranslatedJourney = {
  id: "starter_1",
  name: "Dawn at the Sphinx",
  type: "pyramid",
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
    mapPiece: {
      startChance: 0.67,
      changeIncrease: 0.2,
    },
    completed: {
      pieces: [1, 2],
      pieceLevels: [1, 2],
    },
  },
  difficultyLabel: "Starter",
  lengthLabel: "Short",
  timeLabel: "Morning",
}

const mockTreasureTombJourney: TranslatedJourney = {
  id: "starter_treasure_tomb",
  name: "Forgotten Merchant's Cache",
  type: "treasure_tomb",
  description:
    "Discover a small underground chamber where an ancient merchant hid his precious goods. A perfect introduction to treasure hunting.",
  difficulty: "starter",
  journeyLength: "short",
  levelCount: 4,
  difficultyLabel: "Starter",
  lengthLabel: "Short",
}

const meta = {
  title: "UI/JourneyCard",
  component: JourneyCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    showAnimation: {
      control: "boolean",
    },
    showDetails: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    completionCount: {
      control: "number",
    },
    progressLevelNr: {
      control: "number",
    },
    hasMapPiece: {
      control: "boolean",
    },
    index: {
      control: "number",
    },
  },
} satisfies Meta<typeof JourneyCard>

export default meta
type Story = StoryObj<typeof meta>

export const PyramidJourney: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const TreasureTombJourney: Story = {
  args: {
    journey: mockTreasureTombJourney,
    index: 0,
    showAnimation: false,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const WithProgress: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    progressLevelNr: 2,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const Completed: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    completionCount: 3,
    hasMapPiece: true,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const WithDetails: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    showDetails: true,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const Disabled: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    disabled: true,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}

export const WithAnimation: Story = {
  args: {
    journey: mockPyramidJourney,
    index: 2,
    showAnimation: true,
    onClick: (journey) => console.log("Journey clicked:", journey.name),
  },
}
