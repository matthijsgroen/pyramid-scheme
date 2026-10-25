import { useTranslation } from "react-i18next"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import { useGameStorage } from "@/support/useGameStorage"
import { heardScenes } from "@/mods/story/game/log/heardScenes"

// The scenes the player has heard. Loaded follows the conversations save, the only one it reads.
export const useStoryTab = (): CollectionTab => {
  const { t } = useTranslation("common")
  const [played, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  const ids = heardScenes(played).map(scene => scene.id)
  return { label: t("collection.tabs.stories"), shown: ids.length > 0, ids, loaded }
}
