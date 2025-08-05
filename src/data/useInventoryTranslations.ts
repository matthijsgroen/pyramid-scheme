import { useTranslation } from "react-i18next"
import {
  egyptianDeities,
  egyptianProfessions,
  egyptianAnimals,
  egyptianArtifacts,
} from "@/data/inventory"

// Hook to get translated inventory item
export const useInventoryItem = (id: string) => {
  const { t } = useTranslation("inventory")

  // Find the item in all collections
  const allItems = [
    ...egyptianDeities,
    ...egyptianProfessions,
    ...egyptianAnimals,
    ...egyptianArtifacts,
  ]

  const item = allItems.find((item) => item.id === id)

  if (!item) {
    return null
  }

  // Determine the category based on ID prefix
  let category = ""
  if (id.startsWith("d")) category = "deities"
  else if (id.startsWith("p")) category = "professions"
  else if (id.startsWith("art")) category = "artifacts"
  else if (id.startsWith("a")) category = "animals"

  return {
    id: item.id,
    symbol: item.symbol,
    name: t(`${category}.${id}.name`),
    description: t(`${category}.${id}.description`),
  }
}

// Function to get all items from a category with translations
export const useInventoryCategory = (
  category: "deities" | "professions" | "animals" | "artifacts"
) => {
  const { t } = useTranslation("inventory")

  let items
  switch (category) {
    case "deities":
      items = egyptianDeities
      break
    case "professions":
      items = egyptianProfessions
      break
    case "animals":
      items = egyptianAnimals
      break
    case "artifacts":
      items = egyptianArtifacts
      break
  }

  return items.map((item) => ({
    id: item.id,
    symbol: item.symbol,
    name: t(`${category}.${item.id}.name`),
    description: t(`${category}.${item.id}.description`),
  }))
}
