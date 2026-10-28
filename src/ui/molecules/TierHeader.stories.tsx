import type { Meta, StoryObj } from "@storybook/react-vite"
import { TierHeader } from "./TierHeader"

const meta = {
  component: TierHeader,
  parameters: { layout: "centered" },
  args: { title: "Junior", progress: "1 van 5 klaar" },
  decorators: [
    Story => (
      <div className="w-[358px] bg-camp-paper p-3.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TierHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}
export const CollapsedWithDot: Story = {
  args: {
    title: "Beginner",
    progress: "5 van 5 klaar",
    collapsible: { open: false, onToggle: () => {}, label: "Tier tonen" },
    dot: true,
    dotLabel: "Er is iets nieuws",
  },
}
export const Open: Story = {
  args: { collapsible: { open: true, onToggle: () => {}, label: "Tier verbergen" } },
}
