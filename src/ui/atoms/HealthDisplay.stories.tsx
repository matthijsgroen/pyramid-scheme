import type { Meta, StoryObj } from "@storybook/react-vite"
import { HealthDisplay } from "./HealthDisplay"

const meta = {
  component: HealthDisplay,
  parameters: { layout: "centered" },
} satisfies Meta<typeof HealthDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const Full: Story = { args: { currentHealth: 6, maxHealth: 6 } }
export const TwoAndAHalf: Story = { args: { currentHealth: 5, maxHealth: 6 } }
export const Two: Story = { args: { currentHealth: 4, maxHealth: 6 } }
export const Half: Story = { args: { currentHealth: 1, maxHealth: 6 } }
export const Empty: Story = { args: { currentHealth: 0, maxHealth: 6 } }
export const Extended: Story = { args: { currentHealth: 10, maxHealth: 12 } }
