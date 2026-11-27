import type { Meta, StoryObj } from "@storybook/react-vite"
import { SettingsButton } from "./SettingsButton"

const meta = {
  component: SettingsButton,
  parameters: { layout: "fullscreen" },
  argTypes: {
    onClick: { action: "clicked" },
  },
  decorators: [
    Story => (
      <div className="relative h-64 w-full bg-stone-950">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Settings",
    onClick: () => {},
  },
}
