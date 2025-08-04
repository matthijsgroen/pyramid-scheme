import type { Meta, StoryObj } from "@storybook/react"
import { LootPopup } from "./LootPopup"
import { useState } from "react"

// Mock treasure/item components
const TreasureItem = ({
  symbol,
  rarity,
}: {
  symbol: string
  rarity: string
}) => (
  <div className="flex flex-col items-center">
    <div
      className={`text-6xl mb-2 ${
        rarity === "legendary" ? "animate-pulse" : ""
      }`}
    >
      {symbol}
    </div>
  </div>
)

const MapPieceItem = () => (
  <div className="flex flex-col items-center">
    <div className="text-6xl mb-2">📜</div>
  </div>
)

const CoinItem = ({ amount }: { amount: number }) => (
  <div className="flex flex-col items-center">
    <div className="text-5xl mb-2 text-yellow-400">🪙</div>
    <div className="text-sm font-bold text-white">+{amount}</div>
  </div>
)

// Interactive wrapper component
const InteractiveLootPopup = (args: any) => {
  const [isOpen, setIsOpen] = useState(args.isOpen)

  return (
    <div className="relative">
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-amber-900">
            Loot Popup Demo
          </h2>
          <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-lg"
          >
            Trigger Loot Discovery!
          </button>
        </div>

        <LootPopup
          {...args}
          isOpen={isOpen}
          onDismiss={() => setIsOpen(false)}
        />
      </div>
    </div>
  )
}

const meta = {
  title: "UI/LootPopup",
  component: LootPopup,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: {
      control: "boolean",
    },
    rarity: {
      control: "select",
      options: ["common", "rare", "epic", "legendary"],
    },
    itemName: {
      control: "text",
    },
  },
} satisfies Meta<typeof LootPopup>

export default meta
type Story = StoryObj<typeof meta>

export const CommonTreasure: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Ancient Pottery Shard",
    itemDescription:
      "A fragment of clay pottery from a bygone era. Though common, it tells a story of daily life in ancient times.",
    rarity: "common",
    itemComponent: <TreasureItem symbol="🏺" rarity="common" />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const RareTreasure: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Sacred Ankh",
    itemDescription:
      "A blessed symbol of eternal life, crafted from silver and blessed by temple priests. Its power resonates with ancient magic.",
    rarity: "rare",
    itemComponent: <TreasureItem symbol="☥" rarity="rare" />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const EpicTreasure: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Eye of Horus Amulet",
    itemDescription:
      "A magnificent golden amulet bearing the all-seeing Eye of Horus. Legend says it grants protection and divine insight to its bearer.",
    rarity: "epic",
    itemComponent: <TreasureItem symbol="𓂀" rarity="epic" />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const LegendaryTreasure: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Crown of the Pharaoh",
    itemDescription:
      "The legendary golden crown of ancient pharaohs, adorned with precious gems and imbued with the power of divine rulership. Only the worthy may claim it.",
    rarity: "legendary",
    itemComponent: <TreasureItem symbol="👑" rarity="legendary" />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const MapPiece: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Pyramid Map Piece",
    itemDescription:
      "A crucial fragment of an ancient map revealing hidden passages within the great pyramid. Collect all pieces to unlock the deepest secrets.",
    rarity: "rare",
    itemComponent: <MapPieceItem />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const Coins: Story = {
  render: (args) => <InteractiveLootPopup {...args} />,
  args: {
    isOpen: false,
    itemName: "Gold Coins",
    itemDescription:
      "Gleaming golden coins from the pharaoh's treasury. Each coin bears the mark of ancient Egyptian prosperity.",
    rarity: "common",
    itemComponent: <CoinItem amount={150} />,
    onDismiss: () => console.log("Dismissed"),
  },
}

export const AlwaysOpen: Story = {
  args: {
    isOpen: true,
    itemName: "Golden Scarab",
    itemDescription:
      "A mystical scarab beetle carved from pure gold, said to be a guardian of ancient secrets. Its surface shimmers with otherworldly energy.",
    rarity: "epic",
    itemComponent: <TreasureItem symbol="🪲" rarity="epic" />,
    onDismiss: () => console.log("Popup dismissed"),
  },
}

export const AllRarities: Story = {
  args: {
    isOpen: false,
    itemName: "Golden Scarab",
    rarity: "epic",
    itemComponent: <TreasureItem symbol="🪲" rarity="epic" />,
    onDismiss: () => console.log("Popup dismissed"),
  },
  render: () => {
    const [currentRarity, setCurrentRarity] = useState<
      "common" | "rare" | "epic" | "legendary"
    >("common")
    const [isOpen, setIsOpen] = useState(false)

    const rarityData = {
      common: {
        name: "Clay Tablet",
        symbol: "📜",
        rarity: "common" as const,
        description:
          "An ancient clay tablet inscribed with hieroglyphs. A common find, but valuable to scholars studying ancient texts.",
      },
      rare: {
        name: "Silver Ankh",
        symbol: "☥",
        rarity: "rare" as const,
        description:
          "A beautifully crafted silver ankh, symbol of life and rebirth. Its surface gleams with mystical energy.",
      },
      epic: {
        name: "Golden Falcon",
        symbol: "🦅",
        rarity: "epic" as const,
        description:
          "A magnificent golden falcon statue representing Horus, the sky god. Its eyes seem to follow you with divine wisdom.",
      },
      legendary: {
        name: "Staff of Ra",
        symbol: "🔱",
        rarity: "legendary" as const,
        description:
          "The legendary staff wielded by the sun god Ra himself. Its power is beyond mortal comprehension, radiating divine light.",
      },
    }

    const showLoot = (rarity: "common" | "rare" | "epic" | "legendary") => {
      setCurrentRarity(rarity)
      setIsOpen(true)
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6 text-amber-900">
            All Rarity Types
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {Object.entries(rarityData).map(([key, data]) => (
              <button
                key={key}
                onClick={() => showLoot(key as any)}
                className={`px-4 py-3 font-bold rounded-lg transition-all shadow-lg ${
                  key === "common"
                    ? "bg-gray-500 hover:bg-gray-600 text-white"
                    : key === "rare"
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : key === "epic"
                        ? "bg-purple-500 hover:bg-purple-600 text-white"
                        : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
                }`}
              >
                {data.name}
              </button>
            ))}
          </div>
        </div>

        <LootPopup
          isOpen={isOpen}
          itemName={rarityData[currentRarity].name}
          itemDescription={rarityData[currentRarity].description}
          rarity={currentRarity}
          itemComponent={
            <TreasureItem
              symbol={rarityData[currentRarity].symbol}
              rarity={currentRarity}
            />
          }
          onDismiss={() => setIsOpen(false)}
        />
      </div>
    )
  },
}
