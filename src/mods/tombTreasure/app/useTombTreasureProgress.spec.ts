import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { journeys, type TreasureTombJourney } from "@/data/journeys"

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: <T>(_key: string, initialValue: T | (() => T)) => {
    const [state, setState] = useState(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
    return [
      state,
      (value: T | ((prev: T) => T)) => {
        setState(value)
        return Promise.resolve(value)
      },
    ]
  },
}))

const { useTombTreasureProgress } = await import("./useTombTreasureProgress")

const tomb = journeys.find((j): j is TreasureTombJourney => j.id === "expert_treasure_tomb_b")!

// The map-piece reward popup shows "n of m pieces gathered", so `required` has to be the tomb's own
// authored threshold rather than a hardcoded number — tombs need between 2 and 4 pieces.
describe("mapPieceProgress", () => {
  it("reads required from the tomb's own piecesRequired and starts at zero found", () => {
    const { result } = renderHook(() => useTombTreasureProgress())
    expect(result.current.mapPieceProgress(tomb.id)).toEqual({ found: 0, required: tomb.piecesRequired })
  })

  it("counts up as pieces are collected", async () => {
    const { result } = renderHook(() => useTombTreasureProgress())
    await act(async () => result.current.collectMapPiece(tomb.id))
    expect(result.current.mapPieceProgress(tomb.id).found).toBe(1)
    await act(async () => result.current.collectMapPiece(tomb.id))
    expect(result.current.mapPieceProgress(tomb.id).found).toBe(2)
  })

  it("counts each tomb's map separately", async () => {
    const { result } = renderHook(() => useTombTreasureProgress())
    await act(async () => result.current.collectMapPiece(tomb.id))
    expect(result.current.mapPieceProgress("wizard_treasure_tomb_c").found).toBe(0)
  })

  it("falls back to a non-zero requirement for an unknown tomb", () => {
    const { result } = renderHook(() => useTombTreasureProgress())
    expect(result.current.mapPieceProgress("not_a_tomb")).toEqual({ found: 0, required: 4 })
  })
})
