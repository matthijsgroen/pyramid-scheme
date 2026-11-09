// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CompassResult } from "@/game/siteTypes"

const piece = (over: Partial<CompassResult>): CompassResult => ({
  journeyId: "made_up",
  levelIdx: 0,
  floorIdx: 0,
  hieroglyphId: "h",
  pieceIndex: 0,
  ...over,
})
const scanned = [
  piece({ pieceIndex: 0 }),
  piece({ pieceIndex: 1, floorIdx: 1 }),
  piece({ pieceIndex: 2, wardKeys: ["key"] }),
  piece({ pieceIndex: 3, hidden: true }),
  piece({ pieceIndex: 4, inShop: true }),
]

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/app/translations/useJourneyTranslations", () => ({ useJourneyTranslations: () => [] }))
vi.mock("@/app/SiteMap/detectorScanners", () => ({ useMergedCompassScanner: () => () => scanned }))
vi.mock("@/app/SiteMap/keyProviders", () => ({ useMergedHeldKeys: () => new Set<string>() }))
vi.mock("@/app/pages/gateNeeds", () => ({ useMergedGateNeeds: () => ({ open: () => true }) }))
// Only pyramid 1's first floor has been stood on.
vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({ getJourney: () => ({ floorExploration: { "1:0": { open: false, keySets: [] } } }) }),
}))

const { useCompassHits } = await import("./compassHits")

describe("useCompassHits", () => {
  it("keeps only pieces within reach on a floor the player has been to", () => {
    const { result } = renderHook(() => useCompassHits("h"))
    expect(result.current.map(hit => [hit.pieceIndex, hit.access])).toEqual([
      [0, "open"],
      [4, "unknown"],
    ])
  })
})
