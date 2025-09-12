import type { FC } from "react"
import { use, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/Page"
import { HieroglyphTile } from "@/ui/HieroglyphTile"
import { useInventoryCategory } from "@/data/useInventoryTranslations"
import { useTreasureCategory } from "@/data/useTreasureTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { useJourneys } from "../state/useJourneys"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { FezContext } from "../fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/DeveloperButton"
import { DifficultyPill } from "@/ui/DifficultyPill"
import { Badge } from "@/ui/Badge"

type InventoryCategory = "deities" | "professions" | "animals" | "artifacts"

type TreasureCategory = "merchantCache" | "nobleVault" | "templeSecrets" | "ancientRelics" | "mythicalArtifacts"

type InventoryItem = {
  id: string
  symbol: string
  name: string
  description: string
}

// Map treasure categories to their corresponding difficulty levels
const treasureCategoryToDifficulty: Record<TreasureCategory, Difficulty> = {
  merchantCache: "starter",
  nobleVault: "junior",
  templeSecrets: "expert",
  ancientRelics: "master",
  mythicalArtifacts: "wizard",
}

const CategorySection: FC<{
  category: InventoryCategory
  onItemClick: (item: InventoryItem) => void
  selectedItem: InventoryItem | null
  inventory: Record<string, number | undefined>
}> = ({ category, onItemClick, selectedItem, inventory }) => {
  const { t } = useTranslation("common")
  const items = useInventoryCategory(category)
  const sortedItems = useMemo(
    () =>
      items.slice().sort((a, b) => {
        const levelA = difficulties.indexOf(getItemFirstLevel(a.id))
        const levelB = difficulties.indexOf(getItemFirstLevel(b.id))
        return (levelA || 0) - (levelB || 0)
      }),
    [items]
  )

  return (
    <div className="mb-8">
      <h2 className="mb-4 border-2 border-b-purple-800 bg-purple-800 bg-clip-text font-pyramid text-xl font-semibold text-transparent">
        {t(`collection.categories.${category}`)}
      </h2>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-15">
        {sortedItems.map(item => {
          const itemLevel = getItemFirstLevel(item.id)
          const isSelected = selectedItem?.id === item.id

          const isCollected = inventory[item.id] !== undefined

          if (!isCollected || !itemLevel) {
            // Show empty placeholder for uncollected items
            return <HieroglyphTile key={item.id} empty size="md" className="aspect-square" />
          }

          return (
            <Badge key={item.id} count={inventory[item.id] || 0}>
              <HieroglyphTile
                symbol={item.symbol}
                difficulty={itemLevel}
                selected={isSelected}
                onClick={() => onItemClick(item)}
              />
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

const TreasureCategorySection: FC<{
  category: TreasureCategory
  onItemClick: (item: InventoryItem) => void
  selectedItem: InventoryItem | null
  treasures: Record<string, number | undefined>
}> = ({ category, onItemClick, selectedItem, treasures }) => {
  const { t } = useTranslation("common")
  const items = useTreasureCategory(category)
  const difficulty = treasureCategoryToDifficulty[category]

  return (
    <div className="mb-8">
      <h2 className="mb-4 border-2 border-b-amber-800 bg-amber-800 bg-clip-text font-pyramid text-xl font-semibold text-transparent">
        {t(`collection.treasureCategories.${category}`)}
      </h2>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-10">
        {items.map(item => {
          const isSelected = selectedItem?.id === item.id

          const isCollected = treasures[item.id] !== undefined

          if (!isCollected) {
            // Show empty placeholder for uncollected treasures
            return <HieroglyphTile key={item.id} empty size="md" className="aspect-square" />
          }

          return (
            <HieroglyphTile
              key={item.id}
              symbol={item.symbol}
              difficulty={difficulty}
              selected={isSelected}
              onClick={() => onItemClick(item)}
              className="aspect-square shadow-md hover:shadow-lg"
            />
          )
        })}
      </div>
    </div>
  )
}

const DetailPanel: FC<{
  item: InventoryItem | null
  debug?: boolean
  onAdd?: () => void
}> = ({ item, debug = false, onAdd }) => {
  const { t } = useTranslation("common")
  const difficulty = item ? getItemFirstLevel(item.id) : null

  return (
    <div className="sticky bottom-0 h-48 rounded-lg bg-white/70 p-4 shadow-lg backdrop-blur-sm">
      {item ? (
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-row items-start gap-3">
            <div className="flex-shrink-0">
              <HieroglyphTile symbol={item.symbol} difficulty={getItemFirstLevel(item.id)} size="lg" disabled={false} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-pyramid text-xl font-bold text-gray-900">{item.name}</h3>
              {difficulty && (
                <p>
                  <DifficultyPill difficulty={difficulty} label={t(`difficulty.${difficulty}`)} />
                </p>
              )}
              <p className="leading-relaxed text-gray-700">{item.description}</p>
              {debug && (
                <div>
                  <DeveloperButton onClick={onAdd} label="Add Item" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <span className="mb-2 text-4xl">👆</span>
          <p className="text-gray-600">{t("collection.clickForDetails")}</p>
        </div>
      )}
    </div>
  )
}

export const CollectionPage: FC = () => {
  const { t } = useTranslation("common")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const { getJourney } = useJourneys()
  const { inventory, addItem } = useInventory()
  const { isDevelopMode } = use(DevelopContext)

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (inventory && Object.keys(inventory).length > 0) {
      showConversation("collectionIntro")
    }
  }, [inventory, showConversation])

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item)
  }

  const hasCollectedItems = Object.values(inventory).some(value => value !== undefined)
  const hasCompletedTomb = (tombId: string) => (getJourney(tombId)?.completionCount ?? 0) > 0

  return (
    <Page className="flex bg-gradient-to-b from-blue-100 to-blue-300" snap="end">
      <div className="relative flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-center font-pyramid text-3xl font-bold text-purple-900">{t("collection.title")}</h1>

        <div className="space-y-6 pb-safe-bottom">
          {/* Treasure Categories */}
          {hasCompletedTomb("starter_treasure_tomb") && (
            <TreasureCategorySection
              category="merchantCache"
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              treasures={inventory}
            />
          )}
          {hasCompletedTomb("junior_treasure_tomb") && (
            <TreasureCategorySection
              category="nobleVault"
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              treasures={inventory}
            />
          )}
          {hasCompletedTomb("expert_treasure_tomb") && (
            <TreasureCategorySection
              category="templeSecrets"
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              treasures={inventory}
            />
          )}
          {hasCompletedTomb("master_treasure_tomb") && (
            <TreasureCategorySection
              category="ancientRelics"
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              treasures={inventory}
            />
          )}
          {hasCompletedTomb("wizard_treasure_tomb") && (
            <TreasureCategorySection
              category="mythicalArtifacts"
              onItemClick={handleItemClick}
              selectedItem={selectedItem}
              treasures={inventory}
            />
          )}

          {/* Inventory Categories */}
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
        {hasCollectedItems && (
          <DetailPanel
            item={selectedItem}
            debug={isDevelopMode}
            onAdd={() => selectedItem && addItem(selectedItem?.id, 1)}
          />
        )}
      </div>
    </Page>
  )
}
