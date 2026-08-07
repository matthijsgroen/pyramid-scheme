import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyCard, type JourneyCardJourney } from "./JourneyCard"

const mockPyramidJourney: JourneyCardJourney = {
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
    startNumberRange: [1, 3],
  },
  rewards: {
    mapPiece: {
      startChance: 0.67,
      chanceIncrease: 0.2,
    },
    completed: {
      pieces: [1, 2],
    },
  },
  difficultyLabel: "Starter",
}

const mockTreasureTombJourney: JourneyCardJourney = {
  id: "starter_treasure_tomb",
  name: "Forgotten Merchant's Cache",
  type: "treasure_tomb",
  description:
    "Discover a small underground chamber where an ancient merchant hid his precious goods. A perfect introduction to treasure hunting.",
  difficulty: "starter",
  journeyLength: "short",
  levelCount: 4,
  piecesRequired: 4,
  difficultyLabel: "Starter",
  levelSettings: {
    symbolCount: 2,
    numberRange: [1, 10],
    operators: ["+", "-", "*"],
    compareAmount: 0,
  },
}

const meta = {
  component: JourneyCard,
  parameters: {
    layout: "centered",
  },
  args: {
    journey: mockPyramidJourney,
    index: 0,
    showAnimation: false,
    labels: {
      progressLevel: "Progress: Level",
    },
    onClick: () => {},
  },
} satisfies Meta<typeof JourneyCard>

export default meta
type Story = StoryObj<typeof meta>

export const PyramidJourney: Story = {}
export const TreasureTombJourney: Story = { args: { journey: mockTreasureTombJourney } }
export const WithProgress: Story = { args: { progressLevelNr: 2 } }
export const Completed: Story = { args: { completionCount: 3, hasMapPiece: true } }
export const WithDetails: Story = { args: { showDetails: true } }
export const Disabled: Story = { args: { disabled: true } }
export const WithAnimation: Story = { args: { index: 2, showAnimation: true } }
