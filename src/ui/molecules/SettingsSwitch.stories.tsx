import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SettingsSwitch } from "./SettingsSwitch"

const meta = {
  component: SettingsSwitch,
  args: {
    label: "Sound effects",
    checked: true,
    onChange: fn(),
  },
  decorators: [
    Story => (
      <div className="max-w-md bg-white p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = {}

export const Off: Story = {
  args: { label: "Music", checked: false },
}
