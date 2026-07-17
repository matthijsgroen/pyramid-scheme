import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useInventory } from "@/app/Inventory/useInventory"
import { ALL_SELLABLES } from "@/data/sellables"
import { difficultyByMaterialTier } from "@/data/materialTiers"
import { CategoryGrid } from "@/ui/atoms/CategoryGrid"
import { CollectionSection } from "@/ui/atoms/CollectionSection"
import { CollectibleSlot } from "@/ui/molecules/CollectibleSlot"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"

// The shop mod's Collection contribution: the "junk" category of loose sellables, each shown as an
// empty / collected slot. Registered app-side and gated on the mod (see ./index), so it drops out
// of the shared Collection screen when shop is off — matching the world-gen side that places no
// junk when shop is off.
export const ShopCollectionSection: FC<CollectionSectionProps> = ({ selectedItem, onSelect }) => {
  const { t } = useTranslation(["common", "sellables"])
  const { inventory } = useInventory()

  // Hide the junk category until the player owns at least one sellable — it appears (with its
  // remaining empty slots) once the first is collected.
  if (!ALL_SELLABLES.some(item => inventory[item.id] !== undefined)) return null

  return (
    <CollectionSection title={t("collection.categories.junk")} accent="emerald">
      <CategoryGrid>
        {ALL_SELLABLES.map(item => (
          <CollectibleSlot
            key={item.id}
            state={inventory[item.id] !== undefined ? "collected" : "empty"}
            count={inventory[item.id]}
            symbol={item.symbol}
            difficulty={difficultyByMaterialTier[item.tier]}
            selected={selectedItem?.id === item.id}
            onClick={() =>
              onSelect({
                id: item.id,
                symbol: item.symbol,
                // Sellables aren't hieroglyphs, so the detail panel can't derive a difficulty from
                // the id — carry the tier's difficulty on the emitted item (as tomb treasures do).
                difficulty: difficultyByMaterialTier[item.tier],
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
