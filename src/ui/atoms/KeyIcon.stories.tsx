import type { Meta, StoryObj } from "@storybook/react-vite"
import { KEY_COLORS } from "@/game/siteTypes"
import { KeyIcon } from "./KeyIcon"

const meta = {
  component: KeyIcon,
  decorators: [
    Story => (
      <div className="bg-stone-950 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KeyIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Blue: Story = { args: { color: "blue", title: "Blue key" } }

export const AllColors: Story = {
  args: { color: "blue" },
  render: () => (
    <div className="flex items-center gap-3">
      {KEY_COLORS.map(color => (
        <KeyIcon key={color} color={color} size={32} title={`${color} key`} />
      ))}
    </div>
  ),
}

export const HeldVersusNeeded: Story = {
  args: { color: "red" },
  render: () => (
    <div className="flex items-center gap-3">
      <KeyIcon color="red" size={32} title="held" />
      <KeyIcon color="red" size={32} outlined title="not held" />
    </div>
  ),
}
