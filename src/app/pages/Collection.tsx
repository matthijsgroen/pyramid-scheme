import type { FC } from "react"
import { useState } from "react"
import { Page } from "@/ui/Page"
import { useInventoryCategory } from "@/data/useInventoryTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { hieroglyphLevelColors } from "@/data/hieroglyphLevelColors"

type InventoryCategory = "deities" | "professions" | "animals" | "artifacts"

interface InventoryItem {
  id: string
  symbol: string
  name: string
  description: string
}

const categoryLabels: Record<InventoryCategory, string> = {
  deities: "🏺 Deities",
  professions: "⚱️ Professions",
  animals: "🐾 Animals",
  artifacts: "💎 Artifacts",
}

const CategorySection: FC<{
  category: InventoryCategory
  onItemClick: (item: InventoryItem) => void
  selectedItem: InventoryItem | null
  inventory: Record<string, number | undefined>
}> = ({ category, onItemClick, selectedItem, inventory }) => {
  const items = useInventoryCategory(category)

  return (
    <div className="mb-8">
      <h2 className="mb-4 border-2 border-b-purple-800 bg-purple-800 bg-clip-text font-pyramid text-xl font-semibold text-transparent">
        {categoryLabels[category]}
      </h2>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-10">
        {items.map((item) => {
          const itemLevel = getItemFirstLevel(item.id)
          const bgColor = itemLevel
            ? hieroglyphLevelColors[itemLevel] || "bg-white/80"
            : "bg-white/80"
          const isSelected = selectedItem?.id === item.id
          const borderClass = isSelected
            ? "border-2 border-purple-600 ring-2 ring-purple-300"
            : "border border-transparent"

          const isCollected = inventory[item.id] !== undefined

          if (!isCollected) {
            // Show empty placeholder for uncollected items
            return (
              <div
                key={item.id}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border border-gray-300 bg-gray-100 p-1 opacity-50 shadow-sm"
              >
                <span className="text-2xl text-gray-400">?</span>
              </div>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`group flex aspect-square flex-col items-center justify-center rounded-lg p-1 shadow-md transition-all duration-200 hover:scale-105 hover:bg-white hover:shadow-lg ${bgColor} ${borderClass}`}
            >
              <span className="text-2xl transition-transform duration-200 group-hover:scale-110">
                {item.symbol}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const DetailPanel: FC<{
  item: InventoryItem | null
}> = ({ item }) => {
  return (
    <div className="sticky bottom-0 h-48 rounded-lg bg-white/70 p-4 shadow-lg backdrop-blur-sm">
      {item ? (
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-row items-start gap-3">
            <span className="text-xl md:text-2xl">{item.symbol}</span>
            <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
          </div>
          <p className="leading-relaxed text-gray-700">{item.description}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="mb-2 text-4xl">👆</span>
          <p className="text-gray-600">Click a tile for details</p>
        </div>
      )}
    </div>
  )
}

export const CollectionPage: FC = () => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const { inventory } = useInventory()

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item)
  }

  const hasCollectedItems = Object.values(inventory).some(
    (value) => value !== undefined
  )

  return (
    <Page
      className="flex bg-gradient-to-b from-purple-100 to-purple-300"
      snap="end"
    >
      <div className="relative flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-center font-pyramid text-3xl font-bold text-purple-900">
          Collection
        </h1>

        <div className="space-y-6">
          <CategorySection
            category="deities"
            onItemClick={handleItemClick}
            selectedItem={selectedItem}
            inventory={inventory}
          />
          <CategorySection
            category="professions"
            onItemClick={handleItemClick}
            selectedItem={selectedItem}
            inventory={inventory}
          />
          <CategorySection
            category="animals"
            onItemClick={handleItemClick}
            selectedItem={selectedItem}
            inventory={inventory}
          />
          <CategorySection
            category="artifacts"
            onItemClick={handleItemClick}
            selectedItem={selectedItem}
            inventory={inventory}
          />
        </div>
        {hasCollectedItems && <DetailPanel item={selectedItem} />}
      </div>
    </Page>
  )
}
