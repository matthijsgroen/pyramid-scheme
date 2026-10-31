import { useTranslation } from "react-i18next"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import { difficultyTreasures, keyIdByTreasureId } from "../game/treasures"
import { useTombTreasureProgress } from "./useTombTreasureProgress"

// The treasures whose key is held. Loaded follows the mod's own save, so a list still on its way is
// never mistaken for nothing held.
export const useTombTreasureTab = (): CollectionTab => {
  const { t } = useTranslation("common")
  const { tombKeyIds, loaded } = useTombTreasureProgress()
  const ids = Object.values(difficultyTreasures)
    .flat()
    .filter(treasure => tombKeyIds.has(keyIdByTreasureId[treasure.id]))
    .map(treasure => treasure.id)
  return { label: t("collection.tabs.treasures"), shown: ids.length > 0, ids, loaded }
}
