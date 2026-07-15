import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// ── Minimal world stub ────────────────────────────────────────────────────────

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [
      [
        // floor 0: fragment h1 piece 0 on main path, piece 1 on a side section, piece 2 baked into
        // a shop's `rewards[]` stock array (the shop-stock slice — the compass must see it there).
        {
          mainEndReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 0 },
          sideSections: [
            { endReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 1 } },
            {
              rewards: [
                { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 2 },
                { type: "consumable", consumable: "oil" },
              ],
            },
          ],
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
  it("finds uncollected fragments on main path, side sections, and shop stock", () => {
    hasFragmentImpl = () => false
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    // h1 appears three times: mainEndReward (0), sideSections[0].endReward (1), and a shop's
    // rewards[] stock (2). The compass points at the shop selling the fragment.
    expect(results.map(r => r.pieceIndex).sort()).toEqual([0, 1, 2])
    expect(results[0]).toMatchObject({ journeyId: "starter_1", hieroglyphId: "h1" })
  })

  it("excludes already-collected fragments — including one bought at a shop", () => {
    // Own the shop-stock piece (2): buying it drops the shop from the compass.
    hasFragmentImpl = (id, idx) => id === "h1" && idx === 2
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    expect(results.map(r => r.pieceIndex).sort()).toEqual([0, 1])
  })

  it("returns [] when target not present in world", () => {
    hasFragmentImpl = () => false
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    expect(result.current("nonexistent")).toHaveLength(0)
  })
})
