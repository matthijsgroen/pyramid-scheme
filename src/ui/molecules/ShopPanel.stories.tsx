import type { Meta, StoryObj } from "@storybook/react-vite"
import { ShopPanel } from "./ShopPanel"
import { ShopItemCard } from "@/ui/atoms/ShopItemCard"

const meta = {
  component: ShopPanel,
  args: {
    isOpen: true,
    title: "Fez's Stall",
    balance: 65,
    balanceLabel: "Coins",
    dismissLabel: "Leave",
    onDismiss: () => {},
  },
} satisfies Meta<typeof ShopPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <>
        <ShopItemCard
          itemName="Bandage"
          icon="🩹"
          price={10}
          affordable
          buyLabel="Buy"
          soldOutLabel="Sold out"
          onBuy={() => {}}
        />
        <ShopItemCard
          itemName="Trap Tool"
          icon="🔧"
          price={80}
          affordable={false}
          buyLabel="Buy"
          soldOutLabel="Sold out"
          onBuy={() => {}}
        />
        <ShopItemCard
          itemName="Hieroglyph Fragment"
          itemDescription="A rare piece, relocated to this shop."
          icon="𓂀"
          price={120}
          affordable
          featured
          buyLabel="Buy"
          soldOutLabel="Sold out"
          onBuy={() => {}}
        />
      </>
    ),
  },
}

export const Closed: Story = { args: { isOpen: false, children: null } }
