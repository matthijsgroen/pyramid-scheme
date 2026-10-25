import { useTranslation } from "react-i18next"
import { useInventory } from "@/app/Inventory/useInventory"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import { ALL_SELLABLES } from "@/data/sellables"

// The sellables owned, named by the junk category without its leading emoji. Loaded follows the
// inventory, the only save the shop's tab reads.
export const useShopTab = (): CollectionTab => {
  const { t } = useTranslation("common")
  const { inventory, loaded } = useInventory()
  const ids = ALL_SELLABLES.filter(item => inventory[item.id] !== undefined).map(item => item.id)
  return { label: t("collection.categories.junk").replace(/^[^\p{L}]+/u, ""), shown: ids.length > 0, ids, loaded }
}
