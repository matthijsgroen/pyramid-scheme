import type { FC } from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { difficultyCompare } from "@/data/difficultyLevels"
import { compassKey, compassLabel, uniqueBy } from "@/game/compassPrecision"
import { useInventory } from "@/app/Inventory/useInventory"
import { useMergedGateNeeds } from "@/app/pages/gateNeeds"
import { currentChapter } from "@/app/pages/journeyAvailability"
import { useCompassHits } from "@/app/SiteMap/compassHits"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useDetector } from "@/app/state/useDetector"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { CompassSheet } from "@/ui/molecules/CompassSheet"
import { getItemFirstLevel } from "../game/itemLevelLookup"
import { HIEROGLYPH_SYMBOLS } from "./hieroglyphSymbols"
import { COMPASS_CAP, useHieroglyphProgress } from "./useHieroglyphProgress"

/**
 * The compass's tab on the camp's Detectors screen. It offers the signs not yet complete from the chapters
 * reached, shows where the picked one's pieces lie at the compass's own precision, and follows it: the
 * pyramid's compass readout then hunts that sign.
 */
export const CompassPanel: FC = () => {
  const { t } = useTranslation("common")
  const { compassLevel, compassTarget, setCompassTarget, hieroglyphProgress } = useHieroglyphProgress()
  const { inventory } = useInventory()
  const { setDetector } = useDetector()
  const heldKeys = useMergedHeldKeys()
  const gateNeeds = useMergedGateNeeds()
  const chapter = currentChapter(heldKeys, tier => gateNeeds.open({ tier }, heldKeys))
  const journeys = useJourneyTranslations()
  const journeyName = useMemo(() => {
    const names = new Map(journeys.map(j => [j.id, j.name]))
    return (id: string) => names.get(id) ?? id
  }, [journeys])

  const glyphs = Object.entries(HIEROGLYPH_SYMBOLS).flatMap(([id, symbol]) => {
    const tier = getItemFirstLevel(id)
    const { found, required } = hieroglyphProgress(id)
    const complete = inventory[id] !== undefined || found >= required
    return tier && difficultyCompare(tier, chapter) <= 0 && !complete
      ? [{ id, symbol, progress: `${found}/${required}` }]
      : []
  })
  const [picked, setPicked] = useState(() => glyphs.find(g => g.id === compassTarget)?.id ?? null)
  const hits = useCompassHits(picked)
  const rows = uniqueBy(hits, hit => compassKey(hit, compassLevel)).map(hit => ({
    key: compassKey(hit, compassLevel),
    label: compassLabel(hit, compassLevel, journeyName),
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
