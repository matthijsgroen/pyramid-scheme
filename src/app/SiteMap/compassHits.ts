import { useCallback, useMemo } from "react"
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
// Precedence runs hardest-blocker-first: an outright lock outranks needing the corridor detector,
// which outranks a cost we can't evaluate.
const accessOf = (
  hit: { journeyId: string; wardKeys?: readonly string[]; hidden?: boolean; inShop?: boolean },
  heldKeys: ReadonlySet<string>,
  gateOpen: (tier: Difficulty) => boolean
): { access: CompassAccess; missingKeys?: readonly string[] } => {
  const missingKeys = (hit.wardKeys ?? []).filter(k => !heldKeys.has(k))
  if (missingKeys.length > 0) return { access: "locked", missingKeys }
  // Same gate the all-journeys list uses, including tiers this release doesn't ship yet.
  const tier = JOURNEY_TIER[hit.journeyId] as Difficulty | undefined
  if (tier && !isTierUnlocked(tier, heldKeys, gateOpen)) return { access: "locked" }
  if (hit.hidden) return { access: "hidden" }
  // Entering a tomb costs map pieces and shop stock costs money; neither is modelled here, so say
  // "don't know" rather than implying the piece is there for the taking.
  if (hit.inShop || TOMB_JOURNEY_IDS.has(hit.journeyId)) return { access: "unknown" }
  return { access: "open" }
}

// Every uncollected piece of the target, each with whether the player can go get it now. Compass
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
  return useMemo(
    () => (target ? scanCompass(target, { cells }).map(hit => ({ ...hit, ...accessOf(hit, heldKeys, gateOpen) })) : []),
    [target, cells, scanCompass, heldKeys, gateOpen]
  )
}
