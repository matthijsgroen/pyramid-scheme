import { useMemo, useState } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { DetectorMode, CompassAccess, CompassHit, ConsumableResult } from "@/game/siteTypes"
import type { JourneyAPI } from "./useJourneys"
import { useMergedCompassScanner } from "@/app/SiteMap/detectorScanners"
import { useCompassTarget } from "@/app/SiteMap/compassTarget"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { decodeEdge } from "@/app/SiteMap/useAssembledFloor"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "@/worldGen/data"
import { TIER_UNLOCK_PERK_IDS } from "@/data/treasurePerks"

export type DetectorAPI = {
  /** Which detector is RUNNING. Independent of whether the readout is showing. */
  activeDetector: DetectorMode
  /** Whether the readout panel is showing. Closing it leaves the detector running. */
  readoutOpen: boolean
  compassTarget: string | null
  setDetector: (mode: DetectorMode) => void
  setReadoutOpen: (open: boolean) => void
  compassResults: CompassHit[]
  consumableResults: ConsumableResult[]
}

// journeyId → its tier, and which journeys are tombs. Same derivation as placeFragments' own
// buildJourneyMeta; built once since the world is static.
const JOURNEY_TIER: Record<string, string> = Object.fromEntries(
  [...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS].map(j => [j.id, j.tier])
)
const TOMB_JOURNEY_IDS = new Set(TOMB_JOURNEYS.map(j => j.id))

// Can the player go get this piece right now? Only claims what's checkable — see CompassAccess.
// Precedence runs hardest-blocker-first: an outright lock outranks needing the corridor detector,
// which outranks a cost we can't evaluate.
const accessOf = (
  hit: { journeyId: string; wardKeys?: readonly string[]; hidden?: boolean; inShop?: boolean },
  heldKeys: ReadonlySet<string>
): { access: CompassAccess; missingKeys?: readonly string[] } => {
  const missingKeys = (hit.wardKeys ?? []).filter(k => !heldKeys.has(k))
  if (missingKeys.length > 0) return { access: "locked", missingKeys }
  // A tier with no unlock ids is the first one — always open. Otherwise ANY of its unlock treasures
  // opens it (mirrors reachability's isTierUnlocked).
  const unlockIds = TIER_UNLOCK_PERK_IDS[JOURNEY_TIER[hit.journeyId] ?? ""]
  if (unlockIds && !unlockIds.some(k => heldKeys.has(k))) return { access: "locked" }
  if (hit.hidden) return { access: "hidden" }
  // Entering a tomb costs map pieces and shop stock costs money; neither is modelled here, so say
  // "don't know" rather than implying the piece is there for the taking.
  if (hit.inShop || TOMB_JOURNEY_IDS.has(hit.journeyId)) return { access: "unknown" }
  return { access: "open" }
}

export const useDetector = (journeys: JourneyAPI): DetectorAPI => {
  // Two separate things, deliberately: which detector is running, and whether its readout is on
  // screen. The readout is a card over the map, so the player wants it shut most of the time — while
  // the detector keeps reading, reported by the pulsing dot beside its button. Results below stay
  // keyed on activeDetector alone, which is what keeps them coming while the card is closed.
  // Persisted, not component state: SiteMapScreen is remounted per site entry, so a plain useState
  // would switch the detector off every time the player walks into another pyramid. useGameStorage
  // also syncs every instance of this key, so a screen outside the site map reads the same reading.
  const [activeDetector, setActiveDetector] = useGameStorage<DetectorMode>("activeDetector", null)
  const [readoutOpen, setReadoutOpen] = useState(false)
  // The hunt target is picked on Collection and owned by the fragment mod (§3C); core reads it via
  // the seam (null when no mod owns it) so a target survives navigation into a site.
  const compassTarget = useCompassTarget()
  const scanCompass = useMergedCompassScanner()
  const heldKeys = useMergedHeldKeys()

  // Compass scanning is mod-owned (each mod registers a scanner for its own reward type via
  // detectorScanners); core just runs the merged scanner for the current target, then resolves each
  // hit's access against the keys the player holds — the scanner reports gates, it can't judge them.
  // `compassTarget` must stay a bare string for this memo to hold; see compassTarget.ts.
  const compassResults = useMemo<CompassHit[]>(
    () =>
      activeDetector === "compass" && compassTarget
        ? scanCompass(compassTarget).map(hit => ({ ...hit, ...accessOf(hit, heldKeys) }))
        : [],
    [activeDetector, compassTarget, scanCompass, heldKeys]
  )

  const consumableResults = useMemo((): ConsumableResult[] => {
    if (activeDetector !== "consumable") return []
    // Returns edgeIds of chests with consumables that were skipped due to full inventory.
    // We surface all journeys' skipped consumables so the player knows where to return.
    const results: ConsumableResult[] = []
    for (const [journeyId] of Object.entries(generatedWorldConfigs)) {
      const skipped = journeys.getSkippedConsumables(journeyId)
      for (const edgeId of skipped) {
        // edgeId encodes "floor:row,col" — decode so the panel can narrow the readout by level (§7.2).
        const [floorIdx, row, col] = decodeEdge(edgeId)
        results.push({ journeyId, edgeId, floorIdx, cell: { row, col } })
      }
    }
    return results
  }, [activeDetector, journeys])

  return {
    activeDetector,
    readoutOpen,
    compassTarget,
    setDetector: setActiveDetector,
    setReadoutOpen,
    compassResults,
    consumableResults,
  }
}
