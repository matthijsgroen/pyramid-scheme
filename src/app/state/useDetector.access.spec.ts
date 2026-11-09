// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { CompassResult } from "@/game/siteTypes"

// Whether a compass hit is collectable right now. The scanner reports the gates it walked past; this layer decides,
// against the keys the player holds, which of them are in the way, and drops a piece that is out of reach.
//
// A separate file from useDetector.spec.ts on purpose: the seam registries are module-global, so
// registering a target/scanner here would break that spec's "no mod registered → nothing to scan".

vi.mock("@/data/generatedWorld", () => ({ generatedWorldConfigs: { starter_1: [[{}]] } }))

// Persistence is useDetector.spec's business; here the running detector is just component state.
vi.mock("@/support/useGameStorage", async () => {
  const { useState } = await vi.importActual<typeof import("react")>("react")
  return { useGameStorage: (_key: string, initial: unknown) => useState(initial) }
})

// Every floor has been stood on, so only access decides what the compass keeps.
vi.mock("@/app/state/useJourneys", () => ({
  useJourneys: () => ({ getJourney: () => ({ floorExploration: { "1:0": { open: false, keySets: [] } } }) }),
}))

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

const hit = (over: Partial<CompassResult> = {}): CompassResult => ({
  journeyId: "starter_1",
  levelIdx: 0,
  floorIdx: 0,
  hieroglyphId: "h1",
  pieceIndex: 0,
  ...over,
})

const accessOf = () => {
  const { result } = renderHook(() => useDetector())
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

  it("drops a piece behind a ward key not held", () => {
    hits = [hit({ wardKeys: ["starter_a_1"] })]
    expect(accessOf()).toBeUndefined()
  })

  it("is open once that ward key is held", () => {
    hits = [hit({ wardKeys: ["starter_a_1"] })]
    held = ["starter_a_1"]
    expect(accessOf().access).toBe("open")
  })

  it("needs EVERY key of a nested gate chain, not just one", () => {
    hits = [hit({ wardKeys: ["starter_a_1", "starter_a_2"] })]
    held = ["starter_a_1"]
    expect(accessOf()).toBeUndefined()
  })

  it("drops a piece in a tier not unlocked yet", () => {
    hits = [hit({ journeyId: "junior_1" })]
    expect(accessOf()).toBeUndefined()
  })

  it("is open in a locked-by-default tier once any of its unlock treasures is held", () => {
    hits = [hit({ journeyId: "junior_1" })]
    held = ["starter_a_3"] // any one of junior's four unlock ids opens the tier
    expect(accessOf().access).toBe("open")
  })

  it("drops a piece in a hidden corridor", () => {
    hits = [hit({ hidden: true })]
    expect(accessOf()).toBeUndefined()
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
})
