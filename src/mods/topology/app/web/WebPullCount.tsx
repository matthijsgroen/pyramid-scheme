import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { journeyPulls } from "@/mods/topology/game/web/journeyPulls"
import { useWebPulled } from "./useWebPulled"
import { WORLD_ACTIVATORS } from "./activators"

/** How far the sand has been drawn off a buried journey: its levers pulled of those it waits on. */
export const WebPullCount: FC<{ journeyInfo: CombinedJourneyState }> = ({ journeyInfo }) => {
  const { t } = useTranslation("common")
  const { pulled } = useWebPulled(WORLD_ACTIVATORS)
  const count = journeyPulls(generatedWorldConfigs[journeyInfo.journeyId] ?? [], WORLD_ACTIVATORS, pulled)
  if (!count) return null
  return (
    <p className="mt-2 text-xs font-bold text-amber-800" data-testid="web-pull-count">
      {t("ui.webPullsCleared", count)}
    </p>
  )
}
