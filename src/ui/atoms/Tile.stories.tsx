import type { Meta, StoryObj } from "@storybook/react-vite"
import { Tile } from "./Tile"

const meta = {
  component: Tile,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "excluded", "included"],
    },
  },
} satisfies Meta<typeof Tile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { value: 5, variant: "default" },
}

export const Excluded: Story = {
  args: { value: 5, variant: "excluded" },
}

export const Included: Story = {
  args: { value: 5, variant: "included" },
}
