import type { Meta, StoryObj } from "@storybook/react-vite"
import { DeveloperButton } from "./DeveloperButton"

const meta = {
  component: DeveloperButton,
  parameters: { layout: "centered" },
  argTypes: {
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof DeveloperButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Reset Save",
  },
}

export const AnotherAction: Story = {
  args: {
    label: "Generate World",
  },
}
