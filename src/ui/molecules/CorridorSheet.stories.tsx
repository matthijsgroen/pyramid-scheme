import type { Meta, StoryObj } from "@storybook/react-vite"
import { CorridorSheet } from "./CorridorSheet"

const meta = {
  component: CorridorSheet,
  decorators: [
    Story => (
      <div className="max-w-sm bg-camp-glass-solid p-2">
        <Story />
      </div>
    ),
  ],
  args: {
    parts: { held: 2, total: 4 },
    partsLabel: "2 of 4 parts · hears this whole floor",
    inPyramid: "Inside a pyramid it listens for closed corridors.",
    next: "With all four parts it hears other journeys from camp.",
  },
} satisfies Meta<typeof CorridorSheet>

export default meta
type Story = StoryObj<typeof meta>

export const TwoParts: Story = {}

export const AllParts: Story = {
  args: { parts: { held: 4, total: 4 }, partsLabel: "4 of 4 parts · hears other journeys", next: undefined },
}
