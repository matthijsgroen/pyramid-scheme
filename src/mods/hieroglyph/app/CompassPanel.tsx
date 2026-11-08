import type { FC } from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { compassKey, compassLabel, uniqueBy } from "@/game/compassPrecision"
import { useInventory } from "@/app/Inventory/useInventory"
import { useCompassHits } from "@/app/SiteMap/compassHits"
import { useDetector } from "@/app/state/useDetector"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { CompassSheet } from "@/ui/molecules/CompassSheet"
import { HIEROGLYPH_SYMBOLS } from "./hieroglyphSymbols"
import { COMPASS_CAP, useHieroglyphProgress } from "./useHieroglyphProgress"
import { startedGlyphs } from "./startedGlyphs"

/**
 * The compass's tab on the camp's Detectors screen. It offers the signs begun but not complete, shows where the picked one's pieces lie at the compass's own precision, and follows it: the
 * pyramid's compass readout then hunts that sign.
 */
export const CompassPanel: FC = () => {
  const { t } = useTranslation("common")
  const { compassLevel, compassTarget, setCompassTarget, hieroglyphProgress } = useHieroglyphProgress()
  const { inventory } = useInventory()
  const { setDetector } = useDetector()
  const journeys = useJourneyTranslations()
  const journeyName = useMemo(() => {
    const names = new Map(journeys.map(j => [j.id, j.name]))
    return (id: string) => names.get(id) ?? id
  }, [journeys])

  const glyphs = startedGlyphs(HIEROGLYPH_SYMBOLS, hieroglyphProgress, id => inventory[id] !== undefined)
  const [picked, setPicked] = useState(() => glyphs.find(g => g.id === compassTarget)?.id ?? null)
  // Camp stops at the floor: a cell means nothing away from the map, and finding one assembles every floor.
  const hits = useCompassHits(picked, { cells: false })
  const shown = Math.min(compassLevel, 2)
  const rows = uniqueBy(hits, hit => compassKey(hit, shown)).map(hit => ({
    key: compassKey(hit, shown),
    label: compassLabel(hit, shown, journeyName),
    access: hit.access,
  }))

  return (
    <CompassSheet
      parts={{ held: compassLevel, total: COMPASS_CAP }}
      partsLabel={`${t("detector.camp.parts", { count: compassLevel, total: COMPASS_CAP })} · ${t(`detector.camp.compassReach.${compassLevel}`)}`}
      pickHeading={t("detector.camp.pickHeading")}
      onlyIncomplete={t("detector.camp.onlyIncomplete")}
      glyphs={glyphs}
      picked={picked}
      onPick={setPicked}
      whereHeading={t("detector.camp.whereHeading", { symbol: picked ? HIEROGLYPH_SYMBOLS[picked] : "" })}
      pickFirst={t("detector.camp.pickFirst")}
      nothingToFind={t("detector.camp.nothingToFind")}
      rows={rows}
      accessLabels={{
        open: t("detector.access.open"),
        locked: t("detector.access.locked"),
        hidden: t("detector.access.hidden"),
        unknown: t("detector.access.unknown"),
      }}
      followLabel={t("detector.camp.follow")}
      followingLabel={t("detector.camp.following")}
      following={picked !== null && picked === compassTarget}
      onFollow={() => {
        if (!picked) return
        setCompassTarget(picked)
        setDetector("compass")
      }}
    />
  )
}
