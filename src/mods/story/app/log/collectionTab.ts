import { useTranslation } from "react-i18next"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import { useGameStorage } from "@/support/useGameStorage"
import { heardScenes } from "@/mods/story/game/log/heardScenes"

// The scenes the player has heard. A scene is heard as it plays, so none is ever news: the tab marks no
// ids. Loaded follows the conversations save, the only one it reads.
export const useStoryTab = (): CollectionTab => {
  const { t } = useTranslation("common")
  const [played, , loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  return { label: t("collection.tabs.stories"), shown: heardScenes(played).length > 0, ids: [], loaded }
}
