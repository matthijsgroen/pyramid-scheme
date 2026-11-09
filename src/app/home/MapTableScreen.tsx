import type { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { DetectorLevelMode } from "@/app/SiteMap/detectorLevels"
import { CollectionTabs } from "@/ui/molecules/CollectionTabs"
import { detectorScreen } from "./detectorScreens"

const PANEL_ID = "map-table-panel"

export type MapTableTab = "journeys" | DetectorLevelMode

/** The camp map table's screen: the journeys, when given, then a tab per detector held. */
export const MapTableScreen: FC<{
  journeys?: ReactNode
  held: readonly DetectorLevelMode[]
  selected: MapTableTab
  onSelect: (tab: MapTableTab) => void
}> = ({ journeys, held, selected, onSelect }) => {
  const { t } = useTranslation("common")
  const tabs: MapTableTab[] = [...(journeys ? ["journeys" as const] : []), ...held]
  const shown = tabs.includes(selected) ? selected : tabs[0]
  const Screen = shown === "journeys" ? undefined : detectorScreen(shown)?.Screen
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tabs.length > 1 && (
        <CollectionTabs
          tabs={tabs.map(tab => ({
            id: tab,
            label: tab === "journeys" ? t("camp.mapTable.journeys") : (detectorScreen(tab)?.title(t) ?? tab),
          }))}
          selected={shown}
          onSelect={id => onSelect(id as MapTableTab)}
          label={t("camp.mapTable.title")}
          panelId={PANEL_ID}
        />
      )}
      <div id={PANEL_ID} role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {shown === "journeys" ? journeys : Screen && <Screen />}
      </div>
    </div>
  )
}
