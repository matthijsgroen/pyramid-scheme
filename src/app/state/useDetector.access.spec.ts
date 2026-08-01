import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { CompassResult } from "@/game/siteTypes"
import type { JourneyAPI } from "./useJourneys"

// Whether a compass hit is actually collectable right now. The scanner reports the gates it walked
// past; this layer decides, against the keys the player holds, which of them are in the way.
//
// A separate file from useDetector.spec.ts on purpose: the seam registries are module-global, so
// registering a target/scanner here would break that spec's "no mod registered → nothing to scan".

vi.mock("@/data/generatedWorld", () => ({ generatedWorldConfigs: { starter_1: [[{}]] } }))

// starter_1 is a starter-tier pyramid (no tier-unlock requirement); junior_1 needs one of starter's
// tomb treasures; junior_treasure_tomb is a tomb, whose entry cost this layer can't evaluate.
let hits: CompassResult[] = []
let held: string[] = []

const { registerCompassTarget } = await import("@/app/SiteMap/compassTarget")
const { registerCompassScanner } = await import("@/app/SiteMap/detectorScanners")
const { registerHeldKeysProvider } = await import("@/app/SiteMap/keyProviders")
registerCompassTarget(() => "h1")
registerCompassScanner(() => () => hits)
registerHeldKeysProvider(() => new Set(held))

const { useDetector } = await import("./useDetector")

const journeys = { getSkippedConsumables: () => [] } as unknown as JourneyAPI

const hit = (over: Partial<CompassResult> = {}): CompassResult => ({
  journeyId: "starter_1",
  levelIdx: 0,
  floorIdx: 0,
  hieroglyphId: "h1",
  pieceIndex: 0,
  ...over,
})

const accessOf = () => {
  const { result } = renderHook(() => useDetector(journeys))
  act(() => result.current.setDetector("compass"))
  return result.current.compassResults[0]
}

beforeEach(() => {
  hits = []
  held = []
})

describe("compass hit access", () => {
  it("is open when nothing known stands in the way", () => {
    hits = [hit()]
    expect(accessOf().access).toBe("open")
  })

  it("is locked when a gating ward key is not held, and reports which", () => {
    hits = [hit({ wardKeys: ["starter_a_1"] })]
    expect(accessOf()).toMatchObject({ access: "locked", missingKeys: ["starter_a_1"] })
  })

  it("is open once that ward key is held", () => {
    hits = [hit({ wardKeys: ["starter_a_1"] })]
    held = ["starter_a_1"]
    expect(accessOf().access).toBe("open")
  })

  it("needs EVERY key of a nested gate chain, not just one", () => {
    hits = [hit({ wardKeys: ["starter_a_1", "starter_a_2"] })]
    held = ["starter_a_1"]
    expect(accessOf()).toMatchObject({ access: "locked", missingKeys: ["starter_a_2"] })
  })

  it("is locked when the piece's tier is not unlocked yet", () => {
    hits = [hit({ journeyId: "junior_1" })]
    expect(accessOf().access).toBe("locked")
  })

  it("is open in a locked-by-default tier once any of its unlock treasures is held", () => {
    hits = [hit({ journeyId: "junior_1" })]
    held = ["starter_a_3"] // any one of junior's four unlock ids opens the tier
    expect(accessOf().access).toBe("open")
  })

  it("is hidden for a piece in a hidden corridor", () => {
    hits = [hit({ hidden: true })]
    expect(accessOf().access).toBe("hidden")
  })

  // Cost, not a lock: the readout can't tell whether the player can afford or enter, so it says so
  // rather than implying the piece is there for the taking.
  it("is unknown for shop stock", () => {
    hits = [hit({ inShop: true })]
    expect(accessOf().access).toBe("unknown")
  })

  it("is unknown for a piece inside a tomb", () => {
    hits = [hit({ journeyId: "starter_treasure_tomb" })]
    expect(accessOf().access).toBe("unknown")
  })

  // Hardest blocker wins, so the readout names the thing that actually stops you first.
  it("prefers locked over hidden when both apply", () => {
    hits = [hit({ wardKeys: ["starter_a_1"], hidden: true })]
    expect(accessOf().access).toBe("locked")
  })
})
