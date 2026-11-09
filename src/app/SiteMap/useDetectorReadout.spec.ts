// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Keys stand in for copy; interpolation is appended so an interpolated label still proves it carried
// its data through.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}))

vi.mock("@/app/translations/useJourneyTranslations", () => ({
  useJourneyTranslations: () => [{ id: "starter_2", name: "Papyrus Merchant's Route 2" }],
}))

const { useDetectorReadout } = await import("./useDetectorReadout")

const levels = (over: Partial<{ compass: number; corridor: number }> = {}) => ({
  compass: 0,
  corridor: 0,
  ...over,
})

describe("useDetectorReadout", () => {
  it("offers only the detectors the player owns, in switcher order", () => {
    const { result } = renderHook(() => useDetectorReadout(levels({ compass: 1, corridor: 2 })))

    expect(result.current.available).toEqual(["compass", "hiddenPassageway"])
  })

  it("offers none while the player owns no detector, so the HUD shows no button", () => {
    const { result } = renderHook(() => useDetectorReadout(levels()))

    expect(result.current.available).toEqual([])
  })

  it("names a hit by journey, pyramid and floor, as far as the compass reaches", () => {
    const { result } = renderHook(() => useDetectorReadout(levels({ compass: 2 })))
    const hit = {
      journeyId: "starter_2",
      levelIdx: 1,
      floorIdx: 0,
      hieroglyphId: "h",
      pieceIndex: 0,
      access: "open" as const,
    }

    expect(result.current.hitLabel(hit, 1)).toBe(`Papyrus Merchant's Route 2 · detector.camp.pyramid:{"n":2}`)
    expect(result.current.hitLabel(hit, 2)).toBe(
      `Papyrus Merchant's Route 2 · detector.camp.pyramid:{"n":2} · ui.floor:{"number":1}`
    )
  })

  it("keeps counted labels as functions, so plural rules stay with the app layer", () => {
    const { result } = renderHook(() => useDetectorReadout(levels({ compass: 1 })))

    expect(result.current.labels.more(3)).toBe(`common:detector.more:${JSON.stringify({ count: 3 })}`)
    expect(result.current.labels.lookingFor("𓂀")).toBe(`common:detector.lookingFor:${JSON.stringify({ symbol: "𓂀" })}`)
  })

  it("answers every corridor scope either way, so the readout is never silent", () => {
    const { result } = renderHook(() => useDetectorReadout(levels({ corridor: 3 })))

    const { corridorNearby, corridorNoneNearby, corridorOnFloor, corridorNoneOnFloor } = result.current.labels
    expect([corridorNearby, corridorNoneNearby, corridorOnFloor, corridorNoneOnFloor].every(Boolean)).toBe(true)
  })
})
