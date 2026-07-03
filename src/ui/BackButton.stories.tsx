import type { Meta, StoryObj } from "@storybook/react-vite"
import { BackButton } from "./BackButton"

const meta = {
  title: "UI/BackButton",
  component: BackButton,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
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
} satisfies Meta<typeof BackButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "← Back",
    onClick: () => {},
  },
}
