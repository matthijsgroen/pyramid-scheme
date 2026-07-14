import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// ── Minimal world stub ────────────────────────────────────────────────────────

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [
      [
        // floor 0: fragment h1 piece 0 on main path, piece 1 on a side section
        {
          mainEndReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 0 },
          sideSections: [{ endReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 1 } }],
        },
      ],
    ],
  },
}))

// hasFragment is controlled per test through this ref.
let hasFragmentImpl = (_id: string, _idx: number) => false
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({ hasFragment: (id: string, idx: number) => hasFragmentImpl(id, idx) }),
}))

const { useHieroglyphCompassScanner } = await import("./compassScanner")

describe("useHieroglyphCompassScanner", () => {
  it("finds uncollected fragments on main path and side sections", () => {
    hasFragmentImpl = () => false
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    // h1 appears twice: mainEndReward (piece 0) and sideSections[0] (piece 1)
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ journeyId: "starter_1", hieroglyphId: "h1", pieceIndex: 0 })
  })

  it("excludes already-collected fragments", () => {
    // hasFragment returns true for h1/piece 0 — only piece 1 should appear
    hasFragmentImpl = (id, idx) => id === "h1" && idx === 0
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    expect(results).toHaveLength(1)
    expect(results[0].pieceIndex).toBe(1)
  })

  it("returns [] when target not present in world", () => {
    hasFragmentImpl = () => false
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    expect(result.current("nonexistent")).toHaveLength(0)
  })
})
