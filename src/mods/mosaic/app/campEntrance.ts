import { useTranslation } from "react-i18next"
import { usePiecesToPlace } from "./useMosaicProgress"

// The window's name, with a badge for the pieces the player carries but has not set in yet, like the chest's.
export const useMosaicEntranceLabel = (): { label: string; badge?: number } => {
  const { t } = useTranslation("common")
  const { toPlace } = usePiecesToPlace()
  return { label: t("mosaic.entrance.title"), badge: toPlace > 0 ? toPlace : undefined }
}
