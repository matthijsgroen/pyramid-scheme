import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useJourneyTranslations } from "@/app/translations/useJourneyTranslations"
import { useJourneys } from "@/app/state/useJourneys"
import type { CompassAccess, CompassHit } from "@/game/siteTypes"
import { type CompassScanOptions, useMergedCompassScanner } from "@/app/SiteMap/detectorScanners"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "@/worldGen/data"
import { useMergedGateNeeds } from "@/app/pages/gateNeeds"
import { isTierUnlocked } from "@/app/pages/journeyAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

// journeyId → its tier, and which journeys are tombs. Same derivation as placeFragments' own
// buildJourneyMeta; built once since the world is static.
const JOURNEY_TIER: Record<string, string> = Object.fromEntries(
  [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS].map(j => [j.id, j.tier])
)
const TOMB_JOURNEY_IDS = new Set(TOMB_JOURNEYS.map(j => j.id))

// Can the player go get this piece right now? Only claims what's checkable — see CompassAccess.
// null when a checkable blocker is in the way: a ward key not held, a locked tier, a hidden corridor.
const accessOf = (
  hit: { journeyId: string; wardKeys?: readonly string[]; hidden?: boolean; inShop?: boolean },
  heldKeys: ReadonlySet<string>,
  gateOpen: (tier: Difficulty) => boolean
): CompassAccess | null => {
  if ((hit.wardKeys ?? []).some(k => !heldKeys.has(k))) return null
  // Same gate the all-journeys list uses, including tiers this release doesn't ship yet.
  const tier = JOURNEY_TIER[hit.journeyId] as Difficulty | undefined
  if (tier && !isTierUnlocked(tier, heldKeys, gateOpen)) return null
  if (hit.hidden) return null
  // Entering a tomb costs map pieces and shop stock costs money; neither is modelled here, so say
  // "don't know" rather than implying the piece is there for the taking.
  if (hit.inShop || TOMB_JOURNEY_IDS.has(hit.journeyId)) return "unknown"
  return "open"
}

// Every uncollected piece of the target the player can go get now, on a floor they have stood on: the compass names
// only places the player knows. A tomb's or a shop's piece counts, since that floor was reached. Compass
// scanning is mod-owned (each mod registers a scanner for its own reward type via detectorScanners);
// core runs the merged scanner, then resolves each hit's access against the keys the player holds —
// the scanner reports gates, it can't judge them. `target` must stay a bare string for this memo to
// hold; see compassTarget.ts. No target, no scan.
export const useCompassHits = (target: string | null, options?: CompassScanOptions): CompassHit[] => {
  const scanCompass = useMergedCompassScanner()
  const cells = options?.cells
  const heldKeys = useMergedHeldKeys()
  const gateNeeds = useMergedGateNeeds()
  const gateOpen = useCallback((tier: Difficulty) => gateNeeds.open({ tier }, heldKeys), [gateNeeds, heldKeys])
  const { getJourney } = useJourneys()
  const hits = useMemo(
    () =>
      target
        ? scanCompass(target, { cells }).flatMap(hit => {
            const access = accessOf(hit, heldKeys, gateOpen)
            return access ? [{ ...hit, access }] : []
          })
        : [],
    [target, cells, scanCompass, heldKeys, gateOpen]
  )
  // One flag per hit, as a string, so the list below keeps its identity until a flag changes.
  const kept = hits
    .map(hit =>
      getJourney(hit.journeyId)?.floorExploration?.[`${hit.levelIdx + 1}:${hit.floorIdx}`] !== undefined ? "1" : "0"
    )
    .join("")
  return useMemo(() => hits.filter((_, i) => kept[i] === "1"), [hits, kept])
}

/**
 * A hit as a player reads it, at the compass's precision: "Schrijversacademie · Piramide 2 · Verdieping 1". A tomb is
 * one site, so it names no pyramid.
 */
export const useCompassHitLabel = (): ((hit: CompassHit, level: number) => string) => {
  const { t } = useTranslation("common")
  const journeys = useJourneyTranslations()
  return useMemo(() => {
    const names = new Map(journeys.map(j => [j.id, j.name]))
    return (hit, level) =>
      [
        names.get(hit.journeyId) ?? hit.journeyId,
        TOMB_JOURNEY_IDS.has(hit.journeyId) ? undefined : t("detector.camp.pyramid", { n: hit.levelIdx + 1 }),
        level >= 2 ? t("ui.floor", { number: hit.floorIdx + 1 }) : undefined,
        level >= 3 && hit.cell ? `(${hit.cell.row},${hit.cell.col})` : undefined,
      ]
        .filter(Boolean)
        .join(" · ")
  }, [t, journeys])
}
