import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useJourneys } from "@/app/state/useJourneys"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { CorridorSheet } from "@/ui/molecules/CorridorSheet"

/**
 * The corridor finder's tab on the camp's Detectors screen. It hears near to far: nearby, the floor, the
 * other floors, and with every part other journeys, so only then does camp name where corridors wait.
 */
export const CorridorPanel: FC<{ cap: number }> = ({ cap }) => {
  const { t } = useTranslation("common")
  const level = useMergedDetectorLevels().corridor
  const { getOutstandingHiddenCorridorsByLevel } = useJourneys()
  const journeys = useJourneyTranslations()
  const rows =
    level < cap
      ? []
      : journeys.flatMap(journey =>
          [...getOutstandingHiddenCorridorsByLevel(journey.id)].map(([levelNr, count]) => ({
            key: `${journey.id}:${levelNr}`,
            label: journey.name,
            detail:
              journey.exterior === "tomb"
                ? t("detector.camp.corridorCount", { count })
                : `${t("detector.camp.pyramid", { n: levelNr })} · ${t("detector.camp.corridorCount", { count })}`,
          }))
        )
  return (
    <CorridorSheet
      parts={{ held: level, total: cap }}
      partsLabel={`${t("detector.camp.parts", { count: level, total: cap })} · ${t(`detector.camp.corridorReach.${level}`)}`}
      inPyramid={t("detector.camp.corridorInPyramid")}
      next={level < cap ? t("detector.camp.corridorFarNext") : undefined}
      journeys={
        level < cap
          ? undefined
          : { heading: t("detector.camp.corridorWhere"), none: t("detector.camp.corridorNone"), rows }
      }
    />
  )
}
