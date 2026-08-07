import type { Meta, StoryObj } from "@storybook/react-vite"
import { FezShop } from "./FezShop"

const meta = {
  component: FezShop,
  args: {
    isOpen: true,
    title: "Fez's Stall",
    balance: 340,
    balanceLabel: "Coins",
    dismissLabel: "Leave",
    buyLabel: "Buy",
    soldOutLabel: "Sold out",
    sellLabel: "Sell",
    rareItemsLabel: "Rare Finds",
    suppliesLabel: "Supplies",
    sellSectionLabel: "Trinkets to sell",
    rareItems: [
      {
        id: "fragment",
        itemName: "Hieroglyph Fragment",
        itemDescription: "A rare piece, relocated to this shop.",
        icon: "𓂀",
        price: 300,
        affordable: true,
        featured: true,
      },
      {
        id: "mosaic",
        itemName: "Mosaic Piece",
        itemDescription: "Completes a collector's set.",
        icon: "🟦",
        price: 500,
        affordable: false,
      },
      {
        id: "mappiece",
        itemName: "Map Piece",
        itemDescription: "Unlocks the last tomb.",
        icon: "🗺️",
        price: 1000,
        affordable: false,
        soldOut: true,
      },
    ],
    consumables: [
      { id: "bandage", itemName: "Bandage", icon: "🩹", price: 20, affordable: true },
      { id: "oil", itemName: "Lamp Oil", icon: "🏺", price: 50, affordable: true },
      { id: "trapTool", itemName: "Trap Tool", icon: "🔧", price: 40, affordable: false },
    ],
    sellables: [
      { id: "sell1", itemName: "Cracked Amulet", icon: "📿", sellValue: 20, ownedCount: 3 },
      { id: "sell2", itemName: "Chipped Vase", icon: "🏺", sellValue: 10, ownedCount: 0 },
    ],
    onBuy: () => {},
    onSell: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof FezShop>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NothingToSell: Story = { args: { sellables: [] } }

export const Closed: Story = { args: { isOpen: false } }
