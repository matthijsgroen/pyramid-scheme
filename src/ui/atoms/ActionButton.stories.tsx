import type { Meta, StoryObj } from "@storybook/react-vite"
import { ActionButton } from "./ActionButton"

const meta = {
  component: ActionButton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: "Find missing hieroglyphs",
    onClick: () => console.log("clicked"),
  },
}
