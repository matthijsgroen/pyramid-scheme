import type { Meta, StoryObj } from "@storybook/react-vite"
import { GearIcon } from "./GearIcon"

const meta = {
  component: GearIcon,
  decorators: [
    Story => (
      <div className="bg-amber-800 p-4 text-yellow-400">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GearIcon>

export default meta
type Story = StoryObj<typeof meta>

// Default size and colour: as it sits in the app header, inheriting the bar's text colour.
export const Default: Story = { args: {} }

export const Sizes: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-3">
      {[16, 20, 32, 64].map(size => (
        <GearIcon key={size} size={size} />
      ))}
    </div>
  ),
}

// currentColor throughout, so the icon follows the text colour it is placed in — this is what makes
// the header's hover:text-yellow-300 keep working after the switch from an icon font.
export const FollowsTextColour: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-3">
      <span className="text-yellow-400">
        <GearIcon size={32} />
      </span>
      <span className="text-yellow-300">
        <GearIcon size={32} />
      </span>
      <span className="text-red-300">
        <GearIcon size={32} />
      </span>
    </div>
  ),
}
