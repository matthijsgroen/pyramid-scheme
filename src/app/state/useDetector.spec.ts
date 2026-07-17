import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDetector } from "./useDetector"
import type { JourneyAPI } from "./useJourneys"

// ── Minimal world stub ────────────────────────────────────────────────────────
// Compass scanning is mod-owned now (each mod registers a scanner via detectorScanners); this
// spec imports no mod, so the merged compass scanner is empty and compassResults stays []. The
// hieroglyph compass scan itself is covered by src/mods/hieroglyph/app/compassScanner.spec.ts.

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [[{}]],
  },
}))

// ── Stub factories ────────────────────────────────────────────────────────────

const makeJourneys = (skipped: Record<string, string[]> = {}): JourneyAPI =>
  ({ getSkippedConsumables: (id: string) => skipped[id] ?? [] }) as unknown as JourneyAPI

// ── activeDetector state ──────────────────────────────────────────────────────

describe("activeDetector", () => {
  it("starts as null", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    expect(result.current.activeDetector).toBeNull()
  })

  it("setDetector updates the mode", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    act(() => result.current.setDetector("compass"))
    expect(result.current.activeDetector).toBe("compass")
  })

  it("setDetector to null clears the mode", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    act(() => result.current.setDetector("consumable"))
    act(() => result.current.setDetector(null))
    expect(result.current.activeDetector).toBeNull()
  })
})

// ── compassResults ────────────────────────────────────────────────────────────

describe("compassResults", () => {
  it("returns [] when mode is not compass", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    expect(result.current.compassResults).toHaveLength(0)
  })

  it("returns [] when compass active but no target set (no mod owns the target seam here)", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    act(() => result.current.setDetector("compass"))
    // No fragment mod imported → compassTarget seam yields null → nothing to scan.
    expect(result.current.compassTarget).toBeNull()
    expect(result.current.compassResults).toHaveLength(0)
  })
})

// ── consumableResults ─────────────────────────────────────────────────────────

describe("consumableResults", () => {
  it("returns [] when mode is not consumable", () => {
    const journeys = makeJourneys({ starter_1: ["edge-abc"] })
    const { result } = renderHook(() => useDetector(journeys))
    expect(result.current.consumableResults).toHaveLength(0)
  })

  it("returns skipped consumable locations with the edge decoded to floor + cell", () => {
    const journeys = makeJourneys({ starter_1: ["1:2,3", "0:4,5"] })
    const { result } = renderHook(() => useDetector(journeys))
    act(() => result.current.setDetector("consumable"))
    expect(result.current.consumableResults).toHaveLength(2)
    expect(result.current.consumableResults[0]).toEqual({
      journeyId: "starter_1",
      edgeId: "1:2,3",
      floorIdx: 1,
      cell: { row: 2, col: 3 },
    })
  })

  it("returns [] when no consumables were skipped", () => {
    const { result } = renderHook(() => useDetector(makeJourneys()))
    act(() => result.current.setDetector("consumable"))
    expect(result.current.consumableResults).toHaveLength(0)
  })
})
