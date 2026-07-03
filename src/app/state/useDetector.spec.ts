import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDetector } from "./useDetector"
import type { ProgressionAPI } from "./useProgression"
import type { JourneyAPI } from "./useJourneys"

// ── Minimal world stub ────────────────────────────────────────────────────────

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [
      [
        // floor 0: fragment h1 piece 0 on main path
        {
          mainEndReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 0 },
          sideSections: [{ endReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 1 } }],
          chestRewards: [{ type: "hieroglyphFragment", hieroglyphId: "h2", pieceIndex: 0 }],
        },
      ],
    ],
  },
}))

// ── Stub factories ────────────────────────────────────────────────────────────

const makeProgression = (hasFragmentFn = (_id: string, _idx: number) => false): ProgressionAPI =>
  ({ hasFragment: hasFragmentFn }) as unknown as ProgressionAPI

const makeJourneys = (skipped: Record<string, string[]> = {}): JourneyAPI =>
  ({ getSkippedConsumables: (id: string) => skipped[id] ?? [] }) as unknown as JourneyAPI

// ── activeDetector state ──────────────────────────────────────────────────────

describe("activeDetector", () => {
  it("starts as null", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    expect(result.current.activeDetector).toBeNull()
  })

  it("setDetector updates the mode", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("compass"))
    expect(result.current.activeDetector).toBe("compass")
  })

  it("setDetector to null clears the mode", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("consumable"))
    act(() => result.current.setDetector(null))
    expect(result.current.activeDetector).toBeNull()
  })
})

// ── compassResults ────────────────────────────────────────────────────────────

describe("compassResults", () => {
  it("returns [] when mode is not compass", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    expect(result.current.compassResults).toHaveLength(0)
  })

  it("returns [] when compass active but no target set", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("compass"))
    expect(result.current.compassResults).toHaveLength(0)
  })

  it("finds uncollected fragments on main path and side sections", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("compass"))
    act(() => result.current.setCompassTarget("h1"))
    // h1 appears twice: mainEndReward (piece 0) and sideSections[0] (piece 1)
    expect(result.current.compassResults).toHaveLength(2)
    expect(result.current.compassResults[0]).toMatchObject({
      journeyId: "starter_1",
      hieroglyphId: "h1",
      pieceIndex: 0,
    })
  })

  it("excludes already-collected fragments", () => {
    // hasFragment returns true for h1/piece 0 — only piece 1 should appear
    const progression = makeProgression((id, idx) => id === "h1" && idx === 0)
    const { result } = renderHook(() => useDetector(progression, makeJourneys()))
    act(() => result.current.setDetector("compass"))
    act(() => result.current.setCompassTarget("h1"))
    expect(result.current.compassResults).toHaveLength(1)
    expect(result.current.compassResults[0].pieceIndex).toBe(1)
  })

  it("finds fragments in chestRewards", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("compass"))
    act(() => result.current.setCompassTarget("h2"))
    expect(result.current.compassResults).toHaveLength(1)
    expect(result.current.compassResults[0]).toMatchObject({ hieroglyphId: "h2", pieceIndex: 0 })
  })

  it("returns [] when target not present in world", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("compass"))
    act(() => result.current.setCompassTarget("nonexistent"))
    expect(result.current.compassResults).toHaveLength(0)
  })
})

// ── consumableResults ─────────────────────────────────────────────────────────

describe("consumableResults", () => {
  it("returns [] when mode is not consumable", () => {
    const journeys = makeJourneys({ starter_1: ["edge-abc"] })
    const { result } = renderHook(() => useDetector(makeProgression(), journeys))
    expect(result.current.consumableResults).toHaveLength(0)
  })

  it("returns skipped consumable locations when active", () => {
    const journeys = makeJourneys({ starter_1: ["edge-abc", "edge-def"] })
    const { result } = renderHook(() => useDetector(makeProgression(), journeys))
    act(() => result.current.setDetector("consumable"))
    expect(result.current.consumableResults).toHaveLength(2)
    expect(result.current.consumableResults[0]).toEqual({ journeyId: "starter_1", edgeId: "edge-abc" })
  })

  it("returns [] when no consumables were skipped", () => {
    const { result } = renderHook(() => useDetector(makeProgression(), makeJourneys()))
    act(() => result.current.setDetector("consumable"))
    expect(result.current.consumableResults).toHaveLength(0)
  })
})
