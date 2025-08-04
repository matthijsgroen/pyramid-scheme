import type { Meta, StoryObj } from "@storybook/react"
import { MapButton } from "./MapButton"

const meta = {
  title: "UI/MapButton",
  component: MapButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    inJourney: {
      control: "boolean",
    },
    journeyProgress: {
      control: { type: "range", min: 0, max: 1, step: 0.1 },
    },
    pathRotation: {
      control: "select",
      options: [0, 90, 180, 270],
    },
    pathLength: {
      control: "select",
      options: ["short", "medium", "long"],
    },
    label: {
      control: "text",
    },
  },
} satisfies Meta<typeof MapButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Dawn at the Sphinx",
    inJourney: false,
    journeyProgress: 0,
    pathLength: "short",
    onClick: () => console.log("Map button clicked"),
  },
}

export const InProgress: Story = {
  args: {
    label: "Valley of the Kings",
    inJourney: true,
    journeyProgress: 0.6,
    pathLength: "medium",
    onClick: () => console.log("Map button clicked"),
  },
}

export const ShortPath: Story = {
  args: {
    label: "Short Journey",
    inJourney: false,
    journeyProgress: 0,
    pathLength: "short",
    onClick: () => console.log("Map button clicked"),
  },
}

export const MediumPath: Story = {
  args: {
    label: "Medium Journey",
    inJourney: false,
    journeyProgress: 0,
    pathLength: "medium",
    onClick: () => console.log("Map button clicked"),
  },
}

export const LongPath: Story = {
  args: {
    label: "Long Journey",
    inJourney: false,
    journeyProgress: 0,
    pathLength: "long",
    onClick: () => console.log("Map button clicked"),
  },
}

export const RotatedPath: Story = {
  args: {
    label: "Rotated Journey",
    inJourney: false,
    journeyProgress: 0,
    pathLength: "medium",
    pathRotation: 90,
    onClick: () => console.log("Map button clicked"),
  },
}
