import { useState } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import type { DetectorMode, CompassHit } from "@/game/siteTypes"
import { useCompassTarget } from "@/app/SiteMap/compassTarget"
import { useCompassHits } from "@/app/SiteMap/compassHits"

export type DetectorAPI = {
  /** Which detector is RUNNING. Independent of whether the readout is showing. */
  activeDetector: DetectorMode
  /** Whether the readout panel is showing. Closing it leaves the detector running. */
  readoutOpen: boolean
  compassTarget: string | null
  setDetector: (mode: DetectorMode) => void
  setReadoutOpen: (open: boolean) => void
  compassResults: CompassHit[]
}

export const useDetector = (): DetectorAPI => {
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
  // Scanned only while the compass runs: at level 3 a scan assembles every floor holding a piece.
  const compassResults = useCompassHits(activeDetector === "compass" ? compassTarget : null)

  return {
    activeDetector,
    readoutOpen,
    compassTarget,
    setDetector: setActiveDetector,
    setReadoutOpen,
    compassResults,
  }
}
