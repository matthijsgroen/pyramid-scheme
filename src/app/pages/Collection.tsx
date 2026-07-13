import type { FC } from "react"
import { use, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Page } from "@/ui/atoms/Page"
import { HieroglyphTile } from "@/ui/atoms/HieroglyphTile"
import { useTreasureCategory } from "@/app/translations/useTreasureTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { useJourneys } from "../state/useJourneys"
import { type Difficulty } from "@/data/difficultyLevels"
import { ALL_SELLABLES } from "@/data/sellables"
import { difficultyByMaterialTier } from "@/data/treasures"
import { FezContext } from "../fez/context"
import { DevelopContext } from "@/contexts/DevelopMode"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { DifficultyPill } from "@/ui/atoms/DifficultyPill"
import { CategoryGrid } from "@/ui/atoms/CategoryGrid"
import { CollectionSection } from "@/ui/atoms/CollectionSection"
import { CollectibleSlot } from "@/ui/molecules/CollectibleSlot"
import { collectionSections, type CollectionItem } from "./collectionSectionRegistry"
// Side-effect: registers every enabled mod's Collection section into the registry
import "@/mods/registerAllCollectionSections"

type TreasureCategory = "merchantCache" | "nobleVault" | "templeSecrets" | "ancientRelics" | "mythicalArtifacts"

// Map treasure categories to their corresponding difficulty levels
const treasureCategoryToDifficulty: Record<TreasureCategory, Difficulty> = {
  merchantCache: "starter",
  nobleVault: "junior",
  templeSecrets: "expert",
  ancientRelics: "master",
  mythicalArtifacts: "wizard",
}

const TreasureCategorySection: FC<{
  category: TreasureCategory
  onItemClick: (item: CollectionItem) => void
  selectedItem: CollectionItem | null
  treasures: Record<string, number | undefined>
}> = ({ category, onItemClick, selectedItem, treasures }) => {
  const { t } = useTranslation("common")
  const items = useTreasureCategory(category)
  const difficulty = treasureCategoryToDifficulty[category]

  return (
    <CollectionSection title={t(`collection.treasureCategories.${category}`)} accent="amber">
      <CategoryGrid>
        {items.map(item => (
          <CollectibleSlot
            key={item.id}
            state={treasures[item.id] !== undefined ? "collected" : "empty"}
            symbol={item.symbol}
            difficulty={difficulty}
            selected={selectedItem?.id === item.id}
            onClick={() => onItemClick(item)}
            className="aspect-square shadow-md hover:shadow-lg"
          />
        ))}
      </CategoryGrid>
    </CollectionSection>
  )
}

const SellableCategorySection: FC<{
  onItemClick: (item: CollectionItem) => void
  selectedItem: CollectionItem | null
  inventory: Record<string, number | undefined>
}> = ({ onItemClick, selectedItem, inventory }) => {
  const { t } = useTranslation(["common", "sellables"])

  return (
    <CollectionSection title={t("collection.categories.junk")} accent="emerald">
      <CategoryGrid>
        {ALL_SELLABLES.map(item => (
          <CollectibleSlot
            key={item.id}
            state={inventory[item.id] !== undefined ? "collected" : "empty"}
            symbol={item.symbol}
            difficulty={difficultyByMaterialTier[item.tier]}
            selected={selectedItem?.id === item.id}
            onClick={() =>
              onItemClick({
                id: item.id,
                symbol: item.symbol,
                name: t(`${item.id}.name`, { ns: "sellables" }),
                description: t(`${item.id}.description`, { ns: "sellables" }),
              })
            }
            className="aspect-square shadow-md hover:shadow-lg"
          />
        ))}
      </CategoryGrid>
    </CollectionSection>
  )
}

const DetailPanel: FC<{
  item: CollectionItem | null
  debug?: boolean
  onAdd?: () => void
}> = ({ item, debug = false, onAdd }) => {
  const { t } = useTranslation("common")
  const difficulty = item ? getItemFirstLevel(item.id) : null

  return (
    <div className="sticky bottom-0 min-h-fit rounded-lg bg-white/70 p-4 shadow-lg backdrop-blur-sm">
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
              {item.effectDescription && (
                <p className="mt-1 font-serif text-sm text-amber-700 italic">{item.effectDescription}</p>
              )}
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
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
  const { getJourney } = useJourneys()
  const { inventory, addItem } = useInventory()
  const { isDevelopMode } = use(DevelopContext)

  const { showConversation } = use(FezContext)

  useEffect(() => {
    if (inventory && Object.keys(inventory).length > 0) {
      showConversation("collectionIntro")
    }
  }, [inventory, showConversation])

  const handleItemClick = (item: CollectionItem) => {
    setSelectedItem(item)
  }

  const hasCollectedItems = Object.values(inventory).some(value => value !== undefined)
  const hasCompletedTomb = (tombId: string) => (getJourney(tombId)?.completionCount ?? 0) > 0

  return (
    <Page className="flex bg-gradient-to-b from-blue-100 to-blue-300" snap="center">
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

          <SellableCategorySection onItemClick={handleItemClick} selectedItem={selectedItem} inventory={inventory} />

          {/* Mod-contributed sections. Each registers itself gated on its mod, so a section drops
              out when its mod is toggled off — core names none here. */}
          {collectionSections().map(section => (
            <section.Component key={section.id} selectedItem={selectedItem} onSelect={handleItemClick} />
          ))}
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
