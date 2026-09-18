import type { Meta, StoryObj } from "@storybook/react-vite"
import { LockedJourneyCard } from "./LockedJourneyCard"

const meta = {
  component: LockedJourneyCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    found: {
      control: { type: "range", min: 0, max: 5, step: 1 },
    },
    required: {
      control: { type: "range", min: 1, max: 5, step: 1 },
    },
    showAnimation: {
      control: "boolean",
    },
    index: {
      control: { type: "range", min: 0, max: 10, step: 1 },
    },
  },
  args: {
    // The shipped hint for the second expert tomb (public/locales/en/journeys.json)
    hint: "Corridors run past the temple vaults to a sealed door — only the highest priests ever passed it.",
    labels: {
      title: "Treasure Location",
      requires: "Requires map pieces",
      unit: "map pieces",
      howToUnlock: "Complete expeditions to unlock",
    },
  },
} satisfies Meta<typeof LockedJourneyCard>

export default meta
type Story = StoryObj<typeof meta>

export const NoProgress: Story = {
  args: {
    found: 0,
    required: 3,
    showAnimation: false,
    index: 0,
  },
}

export const PartialProgress: Story = {
  args: {
    found: 1,
    required: 3,
    showAnimation: false,
    index: 0,
  },
}

export const AlmostComplete: Story = {
  args: {
    found: 2,
    required: 3,
    showAnimation: false,
    index: 0,
  },
}

export const FourPieces: Story = {
  args: {
    found: 1,
    required: 4,
    showAnimation: false,
    index: 0,
  },
}

export const WithAnimation: Story = {
  args: {
    found: 1,
    required: 3,
    showAnimation: true,
    index: 1,
  },
}

// A tomb with no hint of its own falls back to the plain "requires map pieces" line
export const WithoutHint: Story = {
  args: {
    found: 1,
    required: 3,
    hint: undefined,
    showAnimation: false,
    index: 0,
  },
}
