import { useTranslation } from "react-i18next"
import { usePiecesToPlace } from "./useMosaicProgress"

// The window's label: the pieces the player carries but has not set in yet, or just its name.
export const useMosaicEntranceLabel = (): { label: string } => {
  const { t } = useTranslation("common")
  const { toPlace } = usePiecesToPlace()
  return { label: toPlace > 0 ? t("mosaic.entrance.toPlace", { count: toPlace }) : t("mosaic.entrance.title") }
}
