import type { Meta, StoryObj } from "@storybook/react-vite"
import { ConsumableBar } from "./ConsumableBar"

const meta = {
  title: "UI/ConsumableBar",
  component: ConsumableBar,
  tags: ["autodocs"],
} satisfies Meta<typeof ConsumableBar>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { consumables: { bandage: 0, oil: 0, trapTool: 0 } } }
export const BandageOnly: Story = { args: { consumables: { bandage: 2, oil: 0, trapTool: 0 } } }
export const Mixed: Story = { args: { consumables: { bandage: 1, oil: 1, trapTool: 0 } } }
export const Full: Story = { args: { consumables: { bandage: 1, oil: 0, trapTool: 1 } } }
