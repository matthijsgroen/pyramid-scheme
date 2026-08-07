import type { Meta, StoryObj } from "@storybook/react-vite"
import { JourneyPathView } from "./JourneyPathView"

const meta = {
  component: JourneyPathView,
  parameters: { layout: "centered" },
  argTypes: {
    journeyLength: {
      control: "select",
      options: ["short", "medium", "long"],
    },
    type: {
      control: "select",
      options: ["pyramid", "treasure_tomb"],
    },
  },
} satisfies Meta<typeof JourneyPathView>

export default meta
type Story = StoryObj<typeof meta>

export const Pyramid: Story = {
  args: {
    label: "Dawn at the Sphinx",
    inJourney: true,
    levelCount: 5,
    levelNr: 3,
    journeyLength: "medium",
    type: "pyramid",
    onClick: () => console.log("Journey path clicked"),
  },
}

export const TreasureTomb: Story = {
  args: {
    label: "Valley of the Kings",
    inJourney: true,
    levelCount: 4,
    levelNr: 2,
    journeyLength: "long",
    type: "treasure_tomb",
    onClick: () => console.log("Journey path clicked"),
  },
}

export const NotStarted: Story = {
  args: {
    label: "Uncharted Journey",
    inJourney: false,
    levelCount: 5,
    levelNr: 1,
    journeyLength: "short",
    type: "pyramid",
    onClick: () => console.log("Journey path clicked"),
  },
}

export const WithNudge: Story = {
  args: {
    label: "Map Piece Ready",
    inJourney: true,
    levelCount: 5,
    levelNr: 1,
    journeyLength: "short",
    type: "pyramid",
    nudge: true,
    onClick: () => console.log("Journey path clicked"),
  },
}
