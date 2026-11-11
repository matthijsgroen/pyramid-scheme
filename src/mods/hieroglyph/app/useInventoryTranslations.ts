import { useTranslation } from "react-i18next"
import {
  egyptianDeities,
  egyptianProfessions,
  egyptianAnimals,
  egyptianArtifacts,
  egyptianOfferings,
  egyptianSigns,
} from "@/mods/hieroglyph/game/symbolCatalogue"

export type InventoryCategory = "deities" | "professions" | "animals" | "artifacts" | "offerings" | "signs"

// Each group's id prefix, its translation group and its signs. `art` before `a`: the longer prefix first.
const GROUPS: readonly (readonly [prefix: string, category: InventoryCategory, items: typeof egyptianDeities])[] = [
  ["d", "deities", egyptianDeities],
  ["s", "signs", egyptianSigns],
  ["p", "professions", egyptianProfessions],
  ["o", "offerings", egyptianOfferings],
  ["art", "artifacts", egyptianArtifacts],
  ["a", "animals", egyptianAnimals],
]

// Hook to get translated inventory item
export const useInventoryItem = () => {
  const { t } = useTranslation("inventory")

  return (id: string) => {
    const group = GROUPS.find(([prefix]) => id.startsWith(prefix))
    const item = group?.[2].find(item => item.id === id)
    if (!group || !item) return null

    return {
      id: item.id,
      symbol: item.symbol,
      name: t(`${group[1]}.${id}.name`),
      description: t(`${group[1]}.${id}.description`),
    }
  }
}

// Function to get all items from a category with translations
export const useInventoryCategory = (category: InventoryCategory) => {
  const { t } = useTranslation("inventory")
  const items = GROUPS.find(([, name]) => name === category)?.[2] ?? []

  return items.map(item => ({
    id: item.id,
    symbol: item.symbol,
    name: t(`${category}.${item.id}.name`),
    description: t(`${category}.${item.id}.description`),
  }))
}
