import type { FC } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useInventoryCategory, type InventoryCategory } from "@/mods/hieroglyph/app/useInventoryTranslations"
import { getItemFirstLevel } from "../game/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { difficulties } from "@/data/difficultyLevels"
import { CategoryGrid } from "@/ui/atoms/CategoryGrid"
import { CollectionSection } from "@/ui/atoms/CollectionSection"
import { CollectibleSlot } from "@/ui/molecules/CollectibleSlot"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"

// The hieroglyph mod's Collection contribution: fragment-collectible categories, each hieroglyph
// shown as an empty / partial ("Ra 1/3") / collected slot. Registered app-side and gated on the
// mod (see ./collection), so it drops out of the shared Collection screen when the mod is off.

// Signs last: they are the group that is not a noun, and there is one of them.
const CATEGORIES: InventoryCategory[] = ["deities", "professions", "animals", "artifacts", "offerings", "signs"]

const CategoryGridSection: FC<{
  category: InventoryCategory
  selectedItem: CollectionSectionProps["selectedItem"]
  onSelect: CollectionSectionProps["onSelect"]
  inventory: Record<string, number | undefined>
  hieroglyphFragments: Record<string, number>
  isNew: CollectionSectionProps["isNew"]
  newLabel: string
}> = ({ category, selectedItem, onSelect, inventory, hieroglyphFragments, isNew, newLabel }) => {
  const { t } = useTranslation("common")
  const { hieroglyphProgress } = useHieroglyphProgress()
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
    <CollectionSection title={t(`collection.categories.${category}`)} accent="purple">
      <CategoryGrid>
        {sortedItems.map(item => {
          const itemLevel = getItemFirstLevel(item.id)
          const fragmentsFound = hieroglyphFragments[item.id] ?? 0
          const required = hieroglyphProgress(item.id).required
          const isCollected = inventory[item.id] !== undefined || fragmentsFound >= required
          const state = !itemLevel ? "empty" : isCollected ? "collected" : fragmentsFound > 0 ? "partial" : "empty"
          return (
            <CollectibleSlot
              key={item.id}
              state={state}
              symbol={item.symbol}
              difficulty={itemLevel}
              progress={{ found: fragmentsFound, required }}
              newLabel={isCollected && isNew(item.id) ? newLabel : undefined}
              selected={selectedItem?.id === item.id}
              onClick={() => onSelect({ ...item, difficulty: itemLevel })}
            />
          )
        })}
      </CategoryGrid>
    </CollectionSection>
  )
}

export const HieroglyphCollectionSection: FC<CollectionSectionProps> = ({
  selectedItem,
  onSelect,
  isNew,
  newLabel,
}) => {
  const { inventory } = useInventory()
  const { hieroglyphFragments } = useHieroglyphProgress()
  return (
    <>
      {CATEGORIES.map(category => (
        <CategoryGridSection
          key={category}
          category={category}
          selectedItem={selectedItem}
          onSelect={onSelect}
          inventory={inventory}
          hieroglyphFragments={hieroglyphFragments}
          isNew={isNew}
          newLabel={newLabel}
        />
      ))}
    </>
  )
}
