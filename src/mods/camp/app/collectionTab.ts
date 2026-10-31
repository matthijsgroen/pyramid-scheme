import { useTranslation } from "react-i18next"
import type { CollectionTab } from "@/app/pages/collectionSectionRegistry"
import type { CampStepTable } from "@/mods/camp/game/campSteps"
import { useCampProgress } from "./useCampProgress"

// The found parts of the table's structures as `structure/part`;
// shown once any structure is started. Loaded follows the camp's own save.
export const useCampTab = (table?: CampStepTable): CollectionTab => {
  const { t } = useTranslation("camp")
  const { startedStructures, structureProgress, loaded } = useCampProgress(table)
  const started = startedStructures()
  const ids = started.flatMap(structure => structureProgress(structure).found.map(part => `${structure}/${part}`))
  return { label: t("collection.title"), shown: started.length > 0, ids, loaded }
}
