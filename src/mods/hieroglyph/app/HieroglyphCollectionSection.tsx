import type { FC } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useInventoryCategory } from "@/app/translations/useInventoryTranslations"
import { getItemFirstLevel } from "@/data/itemLevelLookup"
import { useInventory } from "@/app/Inventory/useInventory"
import { allItems } from "@/data/inventory"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { difficulties } from "@/data/difficultyLevels"
import { CategoryGrid } from "@/ui/atoms/CategoryGrid"
import { CollectionSection } from "@/ui/atoms/CollectionSection"
import { CollectibleSlot } from "@/ui/molecules/CollectibleSlot"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"

// id → symbol for every hieroglyph (the four egyptian categories). Used to tell whether a selected
// Collection item is a hieroglyph this mod owns (the hunt affordance only applies to those) and to
// show the hunted glyph in the hunt bar.
const HIEROGLYPH_SYMBOLS: Record<string, string> = Object.fromEntries(allItems.map(i => [i.id, i.symbol]))

// The hieroglyph mod's Collection contribution: fragment-collectible categories, each hieroglyph
// shown as an empty / partial ("Ra 1/3") / collected slot. Registered app-side and gated on the
// mod (see ./collection), so it drops out of the shared Collection screen when the mod is off.

type HieroglyphCategory = "deities" | "professions" | "animals" | "artifacts"

const CATEGORIES: HieroglyphCategory[] = ["deities", "professions", "animals", "artifacts"]

const CategoryGridSection: FC<{
  category: HieroglyphCategory
  selectedItem: CollectionSectionProps["selectedItem"]
  onSelect: CollectionSectionProps["onSelect"]
  inventory: Record<string, number | undefined>
  hieroglyphFragments: Record<string, number>
}> = ({ category, selectedItem, onSelect, inventory, hieroglyphFragments }) => {
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
              selected={selectedItem?.id === item.id}
              onClick={() => onSelect(item)}
            />
          )
        })}
      </CategoryGrid>
    </CollectionSection>
  )
}

// The hunt bar (§3C): the Collection is the compass's target picker. Shown only when the compass is
// unlocked (compassLevel > 0) — with the mod off there's no fragment section at all, so the whole
// affordance is absent. Selecting an uncollected hieroglyph offers "hunt it"; the active target
// shows with a way to stop.
const HuntBar: FC<{
  selectedItem: CollectionSectionProps["selectedItem"]
  inventory: Record<string, number | undefined>
}> = ({ selectedItem, inventory }) => {
  const { t } = useTranslation("common")
  const { compassLevel, compassTarget, setCompassTarget, hieroglyphProgress } = useHieroglyphProgress()
  if (compassLevel === 0) return null

  const isHieroglyph = (id: string) => id in HIEROGLYPH_SYMBOLS
  const isCollected = (id: string) => {
    const { found, required } = hieroglyphProgress(id)
    return inventory[id] !== undefined || found >= required
  }
  const huntable = selectedItem && isHieroglyph(selectedItem.id) && !isCollected(selectedItem.id) ? selectedItem : null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-purple-900/80 px-3 py-2 text-sm text-purple-50">
      <span className="text-lg">🧭</span>
      {compassTarget ? (
        <>
          <span className="flex-1">
            {t("detector.hunting", { symbol: HIEROGLYPH_SYMBOLS[compassTarget] ?? compassTarget })}
          </span>
          <button
            onClick={() => setCompassTarget(null)}
            className="rounded bg-purple-700 px-2 py-1 hover:bg-purple-600"
          >
            {t("detector.huntStop")}
          </button>
        </>
      ) : (
        <span className="flex-1 text-purple-200">{t("detector.huntHint")}</span>
      )}
      {huntable && huntable.id !== compassTarget && (
        <button
          onClick={() => setCompassTarget(huntable.id)}
          className="rounded bg-amber-600 px-2 py-1 text-amber-50 hover:bg-amber-500"
        >
          {t("detector.huntAction", { symbol: huntable.symbol })}
        </button>
      )}
    </div>
  )
}

export const HieroglyphCollectionSection: FC<CollectionSectionProps> = ({ selectedItem, onSelect }) => {
  const { inventory } = useInventory()
  const { hieroglyphFragments } = useHieroglyphProgress()
  return (
    <>
      <HuntBar selectedItem={selectedItem} inventory={inventory} />
      {CATEGORIES.map(category => (
        <CategoryGridSection
          key={category}
          category={category}
          selectedItem={selectedItem}
          onSelect={onSelect}
          inventory={inventory}
          hieroglyphFragments={hieroglyphFragments}
        />
      ))}
    </>
  )
}
