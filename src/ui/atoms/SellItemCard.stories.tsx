import type { Meta, StoryObj } from "@storybook/react-vite"
import { SellItemCard } from "./SellItemCard"

const meta = {
  component: SellItemCard,
  args: {
    itemName: "Scarab Trinket",
    itemDescription: "Worthless to you, priceless to Fez.",
    icon: "🪲",
    sellValue: 8,
    ownedCount: 1,
    sellLabel: "Sell",
    onSell: () => {},
  },
} satisfies Meta<typeof SellItemCard>

export default meta
type Story = StoryObj<typeof meta>

export const One: Story = {}
export const Stacked: Story = { args: { ownedCount: 4 } }
export const NoneOwned: Story = { args: { ownedCount: 0 } }
export const WithoutDescription: Story = { args: { itemDescription: undefined } }
