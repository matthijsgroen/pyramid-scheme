import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { DetectorLevelMode } from "@/app/SiteMap/detectorLevels"
import { CollectionTabs } from "@/ui/molecules/CollectionTabs"
import { detectorScreen } from "./detectorScreens"

const PANEL_ID = "detector-panel"

/** The camp's Detectors screen: a tab per detector held, opened on the one the player tapped. */
export const DetectorsScreen: FC<{
  held: readonly DetectorLevelMode[]
  selected: DetectorLevelMode
  onSelect: (mode: DetectorLevelMode) => void
}> = ({ held, selected, onSelect }) => {
  const { t } = useTranslation("common")
  const Screen = detectorScreen(selected)?.Screen
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {held.length > 1 && (
        <CollectionTabs
          tabs={held.map(mode => ({ id: mode, label: detectorScreen(mode)?.title(t) ?? mode }))}
          selected={selected}
          onSelect={id => onSelect(id as DetectorLevelMode)}
          label={t("camp.entrance.detectors")}
          panelId={PANEL_ID}
        />
      )}
      <div id={PANEL_ID} role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {Screen && <Screen />}
      </div>
    </div>
  )
}
