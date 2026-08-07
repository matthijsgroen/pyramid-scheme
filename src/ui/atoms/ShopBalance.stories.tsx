import type { Meta, StoryObj } from "@storybook/react-vite"
import { ShopBalance } from "./ShopBalance"

const meta = {
  component: ShopBalance,
} satisfies Meta<typeof ShopBalance>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { amount: 0, label: "Coins" } }
export const SomeCoins: Story = { args: { amount: 42, label: "Coins" } }
export const BigStash: Story = { args: { amount: 9999, label: "Coins" } }
