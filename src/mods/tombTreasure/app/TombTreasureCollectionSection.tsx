import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { useMergedPerkContributions } from "@/app/SiteMap/perkContributions"
import { CategoryGrid } from "@/ui/atoms/CategoryGrid"
import { CollectionSection } from "@/ui/atoms/CollectionSection"
import { CollectibleSlot } from "@/ui/molecules/CollectibleSlot"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"
import { difficultyTreasures, keyIdByTreasureId } from "../game/treasures"
import { TREASURE_PERKS } from "../game/treasurePerks"
import { useTombTreasureProgress } from "./useTombTreasureProgress"

// The tomb-treasure mod's Collection contribution: the 40 tomb treasures in 5 per-difficulty
// groups. "Collected" = owning that treasure's tombKey (no inventory item). Each collected slot
// shows the treasure's perk bonus as its effect line — a stat/detector perk via the merged perk
// `describe` (the owning mod's i18n), a tier-unlock/location-key described here, `none` blank.
// Registered app-side gated on the mod (see ./index), so it drops out when tomb-treasure is off.

// The catalog difficulty → its treasures.json category (the authored name/description namespace).
const CATEGORY_BY_DIFFICULTY: Record<Difficulty, string> = {
  starter: "merchantCache",
  junior: "nobleVault",
  expert: "templeSecrets",
  master: "ancientRelics",
  wizard: "mythicalArtifacts",
}

export const TombTreasureCollectionSection: FC<CollectionSectionProps> = ({ selectedItem, onSelect }) => {
  const { t } = useTranslation(["common", "treasures"])
  const { tombKeyIds } = useTombTreasureProgress()
  const { describe } = useMergedPerkContributions()

  // The treasure's perk bonus line: an owned stat/detector perk speaks for itself via the merged
  // describe; tier-unlock/location-key are described here (no perk owner); `none`/unknown blank.
  const bonusFor = (keyId: string): string | undefined => {
    const perk = TREASURE_PERKS[keyId]
    if (!perk) return undefined
    const owned = describe(perk)
    if (owned) return owned.label
    if (perk.type === "tier-unlock")
      return t("perks.tier-unlock", { ns: "treasures", tier: t(`difficulty.${perk.tier}`, { ns: "common" }) })
    if (perk.type === "location-key") return t("perks.location-key", { ns: "treasures" })
    return undefined
  }

  return (
    <>
      {difficulties.map(difficulty => {
        const category = CATEGORY_BY_DIFFICULTY[difficulty]
        return (
          <CollectionSection key={difficulty} title={t(`collection.treasureCategories.${category}`)} accent="amber">
            <CategoryGrid>
              {difficultyTreasures[difficulty].map(treasure => {
                const keyId = keyIdByTreasureId[treasure.id]
                const collected = tombKeyIds.has(keyId)
                return (
                  <CollectibleSlot
                    key={treasure.id}
                    state={collected ? "collected" : "empty"}
                    symbol={treasure.symbol}
                    difficulty={difficulty}
                    selected={selectedItem?.id === treasure.id}
                    onClick={() =>
                      onSelect({
                        id: treasure.id,
                        symbol: treasure.symbol,
                        name: t(`${category}.${treasure.id}.name`, { ns: "treasures" }),
                        description: t(`${category}.${treasure.id}.description`, { ns: "treasures" }),
                        effectDescription: bonusFor(keyId),
                        difficulty,
                      })
                    }
                    className="aspect-square shadow-md hover:shadow-lg"
                  />
                )
              })}
            </CategoryGrid>
          </CollectionSection>
        )
      })}
    </>
  )
}
