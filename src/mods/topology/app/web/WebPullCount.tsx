import type { FC } from "react"
import { useTranslation } from "react-i18next"
import type { CombinedJourneyState } from "@/app/state/useJourneys"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { journeyBuriedPercent } from "@/mods/topology/game/web/buriedPercent"
import { useWebPulled } from "./useWebPulled"
import { WORLD_ACTIVATORS } from "./activators"

/** How much of a buried journey's line still lies behind sand, off the levers pulled. */
export const WebPullCount: FC<{ journeyInfo: CombinedJourneyState }> = ({ journeyInfo }) => {
  const { t } = useTranslation("common")
  const { pulled } = useWebPulled(WORLD_ACTIVATORS)
  const percent = journeyBuriedPercent(generatedWorldConfigs[journeyInfo.journeyId] ?? [], WORLD_ACTIVATORS, pulled)
  if (percent === undefined) return null
  return (
    <p className="mt-2 text-xs font-bold text-amber-800" data-testid="web-pull-count">
      {t("ui.webBuriedPercent", { percent })}
    </p>
  )
}
