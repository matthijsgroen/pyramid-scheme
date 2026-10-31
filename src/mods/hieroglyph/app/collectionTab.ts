import { useTranslation } from "react-i18next"
import { useInventory } from "@/app/Inventory/useInventory"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import { HIEROGLYPH_SYMBOLS } from "./hieroglyphSymbols"
import { useHieroglyphProgress } from "./useHieroglyphProgress"

// The completed hieroglyphs: every fragment found, or held as an item. Loaded only once both the
// mod's progress and the inventory are read, since either one can hold a hieroglyph.
export const useHieroglyphTab = (): CollectionTab => {
  const { t } = useTranslation("common")
  const { inventory, loaded: inventoryLoaded } = useInventory()
  const { hieroglyphFragments, hieroglyphProgress, loaded } = useHieroglyphProgress()
  const ids = Object.keys(HIEROGLYPH_SYMBOLS).filter(id => {
    const { found, required } = hieroglyphProgress(id)
    return inventory[id] !== undefined || found >= required
  })
  return {
    label: t("collection.tabs.hieroglyphs"),
    shown: ids.length > 0 || Object.keys(hieroglyphFragments).length > 0,
    ids,
    loaded: loaded && inventoryLoaded,
  }
}
