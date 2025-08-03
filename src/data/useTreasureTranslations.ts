import { useTranslation } from "react-i18next"
import {
  merchantCacheTreasures,
  nobleVaultTreasures,
  templeSecretsTreasures,
  ancientRelicsTreasures,
  mythicalArtifactsTreasures,
} from "@/data/treasures"

// Hook to get translated treasure item
export const useTreasureItem = (id: string) => {
  const { t } = useTranslation("treasures")

  // Find the item in all collections
  const allTreasures = [
    ...merchantCacheTreasures,
    ...nobleVaultTreasures,
    ...templeSecretsTreasures,
    ...ancientRelicsTreasures,
    ...mythicalArtifactsTreasures,
  ]

  const treasure = allTreasures.find((treasure) => treasure.id === id)

  if (!treasure) {
    return null
  }

  // Determine the category based on treasure ID range
  let category = ""
  const treasureNum = parseInt(id.substring(1))
  if (treasureNum >= 1 && treasureNum <= 4) category = "merchantCache"
  else if (treasureNum >= 5 && treasureNum <= 10) category = "nobleVault"
  else if (treasureNum >= 11 && treasureNum <= 18) category = "templeSecrets"
  else if (treasureNum >= 19 && treasureNum <= 28) category = "ancientRelics"
  else if (treasureNum >= 29 && treasureNum <= 40)
    category = "mythicalArtifacts"

  return {
    id: treasure.id,
    symbol: treasure.symbol,
    name: t(`${category}.${id}.name`),
    description: t(`${category}.${id}.description`),
  }
}

// Function to get all treasures from a category with translations
export const useTreasureCategory = (
  category:
    | "merchantCache"
    | "nobleVault"
    | "templeSecrets"
    | "ancientRelics"
    | "mythicalArtifacts"
) => {
  const { t } = useTranslation("treasures")

  let treasures
  switch (category) {
    case "merchantCache":
      treasures = merchantCacheTreasures
      break
    case "nobleVault":
      treasures = nobleVaultTreasures
      break
    case "templeSecrets":
      treasures = templeSecretsTreasures
      break
    case "ancientRelics":
      treasures = ancientRelicsTreasures
      break
    case "mythicalArtifacts":
      treasures = mythicalArtifactsTreasures
      break
  }

  return treasures.map((treasure) => ({
    id: treasure.id,
    symbol: treasure.symbol,
    name: t(`${category}.${treasure.id}.name`),
    description: t(`${category}.${treasure.id}.description`),
  }))
}
