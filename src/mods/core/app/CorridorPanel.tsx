import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useMergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { CorridorSheet } from "@/ui/molecules/CorridorSheet"

/** The corridor finder's tab on the camp's Detectors screen. It hears near to far: nearby, the floor, the other floors, other journeys. */
export const CorridorPanel: FC<{ cap: number }> = ({ cap }) => {
  const { t } = useTranslation("common")
  const level = useMergedDetectorLevels().corridor
  return (
    <CorridorSheet
      parts={{ held: level, total: cap }}
      partsLabel={`${t("detector.camp.parts", { count: level, total: cap })} · ${t(`detector.camp.corridorReach.${level}`)}`}
      inPyramid={t("detector.camp.corridorInPyramid")}
      next={level < cap ? t("detector.camp.corridorFarNext") : undefined}
    />
  )
}
