import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  merchantCacheTreasures,
  nobleVaultTreasures,
  templeSecretsTreasures,
  ancientRelicsTreasures,
  mythicalArtifactsTreasures,
  type TreasureEffects,
} from "@/data/treasures"

const getEffectDescription = (effects: TreasureEffects | undefined, t: TFunction): string | undefined => {
  if (!effects) return undefined
  if (effects.mapFragmentChance !== undefined) {
    return t("effects.mapFragmentChance", { chance: Math.round(effects.mapFragmentChance * 100) })
  }
  if (effects.higherLootChance !== undefined) {
    return t("effects.higherLootChance", { chance: Math.round(effects.higherLootChance * 100) })
  }
  if (effects.moreLootChance !== undefined) {
    const { chance, tier } = effects.moreLootChance
    if (tier) {
      return t("effects.moreLootChanceTier", { chance: Math.round(chance * 100), tier: t(`tiers.${tier}`) })
    }
    return t("effects.moreLootChanceAdaptive", { chance: Math.round(chance * 100) })
  }
  if (effects.expeditionBonus !== undefined) {
    return t("effects.expeditionBonus", {
      amount: effects.expeditionBonus.amount,
      tier: t(`tiers.${effects.expeditionBonus.tier}`),
    })
  }
  if (effects.errorHighlight) return t("effects.errorHighlight")
  if (effects.earlyFeedback) return t("effects.earlyFeedback")
  if (effects.hieroglyphUnlock) return t("effects.hieroglyphUnlock")
  return undefined
}

// Hook to get translated treasure item
export const useTreasureItem = () => {
  const { t } = useTranslation("treasures")

  // Find the item in all collections
  const allTreasures = [
    ...merchantCacheTreasures,
    ...nobleVaultTreasures,
    ...templeSecretsTreasures,
    ...ancientRelicsTreasures,
    ...mythicalArtifactsTreasures,
  ]
  return (id: string) => {
    const treasure = allTreasures.find(treasure => treasure.id === id)

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
    else if (treasureNum >= 29 && treasureNum <= 40) category = "mythicalArtifacts"

    return {
      id: treasure.id,
      symbol: treasure.symbol,
      name: t(`${category}.${id}.name`),
      description: t(`${category}.${id}.description`),
      effectDescription: getEffectDescription(treasure.effects, t),
    }
  }
}

// Function to get all treasures from a category with translations
export const useTreasureCategory = (
  category: "merchantCache" | "nobleVault" | "templeSecrets" | "ancientRelics" | "mythicalArtifacts"
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

  return treasures.map(treasure => ({
    id: treasure.id,
    symbol: treasure.symbol,
    name: t(`${category}.${treasure.id}.name`),
    description: t(`${category}.${treasure.id}.description`),
    effectDescription: getEffectDescription(treasure.effects, t),
  }))
}
