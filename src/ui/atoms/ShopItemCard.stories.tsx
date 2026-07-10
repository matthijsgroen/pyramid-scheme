import type { Meta, StoryObj } from "@storybook/react-vite"
import { ShopItemCard } from "./ShopItemCard"

const meta = {
  title: "UI/ShopItemCard",
  component: ShopItemCard,
  tags: ["autodocs"],
  args: {
    itemName: "Bandage",
    itemDescription: "Restores a bit of health.",
    icon: "🩹",
    price: 10,
    affordable: true,
    buyLabel: "Buy",
    soldOutLabel: "Sold out",
    onBuy: () => {},
  },
} satisfies Meta<typeof ShopItemCard>

export default meta
type Story = StoryObj<typeof meta>

export const Affordable: Story = {}
export const CantAfford: Story = { args: { affordable: false } }
export const SoldOut: Story = { args: { soldOut: true } }
export const Featured: Story = {
  args: {
    itemName: "Hieroglyph Fragment",
    itemDescription: "A rare piece, relocated to this shop.",
    icon: "𓂀",
    price: 120,
    featured: true,
  },
}
