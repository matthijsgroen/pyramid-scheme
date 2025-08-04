import type { Meta, StoryObj } from "@storybook/react"
import { TombMapButton } from "./TombMapButton"

const meta = {
  title: "UI/TombMapButton",
  component: TombMapButton,
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
    corridorComplexity: {
      control: "select",
      options: ["simple", "moderate", "complex"],
    },
    label: {
      control: "text",
    },
  },
} satisfies Meta<typeof TombMapButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Forgotten Merchant's Cache",
    inJourney: false,
    journeyProgress: 0,
    corridorComplexity: "short",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const InProgress: Story = {
  args: {
    label: "Noble's Hidden Vault",
    inJourney: true,
    journeyProgress: 0.6,
    corridorComplexity: "medium",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const ComplexTomb: Story = {
  args: {
    label: "High Priest's Treasury",
    inJourney: true,
    journeyProgress: 0.8,
    corridorComplexity: "long",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const SimpleLayout: Story = {
  args: {
    label: "Small Chamber",
    inJourney: true,
    journeyProgress: 0.3,
    corridorComplexity: "short",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const ModerateLayout: Story = {
  args: {
    label: "Underground Vault",
    inJourney: true,
    journeyProgress: 0.75,
    corridorComplexity: "medium",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const ComplexMaze: Story = {
  args: {
    label: "Pharaoh's Secret Hoard",
    inJourney: true,
    journeyProgress: 0.9,
    corridorComplexity: "long",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const StartingJourney: Story = {
  args: {
    label: "Vault of the Gods",
    inJourney: true,
    journeyProgress: 0.1,
    corridorComplexity: "long",
    onClick: () => console.log("Tomb map button clicked"),
  },
}

export const NearCompletion: Story = {
  args: {
    label: "Master's Treasury",
    inJourney: true,
    journeyProgress: 0.95,
    corridorComplexity: "medium",
    onClick: () => console.log("Tomb map button clicked"),
  },
}
