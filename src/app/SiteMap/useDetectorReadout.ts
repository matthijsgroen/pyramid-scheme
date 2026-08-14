import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { DetectorMode } from "@/game/siteTypes"
import type { DetectorPanelLabels } from "@/ui/atoms/DetectorPanel"
import type { MergedDetectorLevels } from "@/app/SiteMap/detectorLevels"
import { useCompassTargetLabel } from "@/app/SiteMap/compassTarget"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"

export type DetectorReadout = {
  labels: DetectorPanelLabels
  titles: Record<Exclude<DetectorMode, null>, string>
  /** id → localized journey name, so a hit reads "Papyrus Merchant's Route 2" and not "starter_2". */
  journeyName: (id: string) => string
  /** id → the hunted item's glyph; mod-owned, reached through the compass-target seam. */
  compassTargetLabel: (id: string) => string
  /** The detectors the player owns, in the order the switcher shows them. Empty = no HUD button. */
  available: Exclude<DetectorMode, null>[]
}

// Everything the detector readout needs to render: its strings, and which modes exist for this
// player. Levels arrive as an argument — the screen already reads them for the floor assembly, and
// passing them in keeps this hook drivable from a spec.
export const useDetectorReadout = (levels: MergedDetectorLevels): DetectorReadout => {
  const { t } = useTranslation("common")
  const compassTargetLabel = useCompassTargetLabel()
  // Called ONCE and reduced to a lookup: the per-id useJourneyTranslation is a hook, so it can't be
  // called per result.
  const translatedJourneys = useJourneyTranslations()
  const journeyName = useMemo(() => {
    const names: Record<string, string> = Object.fromEntries(translatedJourneys.map(j => [j.id, j.name]))
    return (id: string) => names[id] ?? id
  }, [translatedJourneys])

  const titles = useMemo(
    () => ({
      compass: t("common:detector.compassTitle"),
      consumable: t("common:detector.consumableTitle"),
      hiddenPassageway: t("common:detector.corridorTitle"),
    }),
    [t]
  )

  const labels = useMemo(
    (): DetectorPanelLabels => ({
      pickTarget: t("common:detector.pickTarget"),
      lookingFor: symbol => t("common:detector.lookingFor", { symbol }),
      allCollected: t("common:detector.allCollected"),
      access: {
        open: t("common:detector.access.open"),
        locked: t("common:detector.access.locked"),
        hidden: t("common:detector.access.hidden"),
        unknown: t("common:detector.access.unknown"),
      },
      more: count => t("common:detector.more", { count }),
      noSkippedChests: t("common:detector.noSkippedChests"),
      corridorNearby: t("common:detector.corridorNearby"),
      corridorNoneNearby: t("common:detector.corridorNoneNearby"),
      corridorOnFloor: t("common:detector.corridorOnFloor"),
      corridorNoneOnFloor: t("common:detector.corridorNoneOnFloor"),
      corridorOtherFloor: t("common:detector.corridorOtherFloor"),
      corridorNoneInPyramid: t("common:detector.corridorNoneInPyramid"),
    }),
    [t]
  )

  const available = useMemo(
    () =>
      [
        ...(levels.compass > 0 ? (["compass"] as const) : []),
        ...(levels.supplies > 0 ? (["consumable"] as const) : []),
        ...(levels.corridor > 0 ? (["hiddenPassageway"] as const) : []),
      ] satisfies Exclude<DetectorMode, null>[],
    [levels.compass, levels.supplies, levels.corridor]
  )

  return { labels, titles, journeyName, compassTargetLabel, available }
}
