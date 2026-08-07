import type { Meta, StoryObj } from "@storybook/react-vite"
import { FloorBadge } from "./FloorBadge"

const meta = {
  component: FloorBadge,
  parameters: { layout: "fullscreen" },
  decorators: [
    Story => (
      <div className="relative h-64 w-full bg-stone-950">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FloorBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Floor 2",
  },
}
