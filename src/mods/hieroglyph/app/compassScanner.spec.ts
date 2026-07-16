import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// ── Minimal world stub ────────────────────────────────────────────────────────
// A valid-enough floor so level-3 assembly (exact-cell resolution) runs. Sections carry the
// structural fields assembleFloor needs (pathPuzzles/difficulty/end).

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [
      [
        // floor 0: fragment h1 piece 0 on main path, piece 1 on a side section, piece 2 in another
        // section's `rewards[]` (the shop-stock slice — the compass must see it there too).
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          mainEndReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 0 },
          sideSections: [
            {
              pathPuzzles: 0,
              difficulty: "starter",
              end: "treasure",
              endReward: { type: "hieroglyphFragment", hieroglyphId: "h1", pieceIndex: 1 },
            },
            {
              pathPuzzles: 0,
              difficulty: "starter",
              end: "treasure",
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

// hasFragment + compassLevel are controlled per test through these refs.
let hasFragmentImpl = (_id: string, _idx: number) => false
let compassLevelImpl = 1
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({
    hasFragment: (id: string, idx: number) => hasFragmentImpl(id, idx),
    compassLevel: compassLevelImpl,
  }),
}))

const { useHieroglyphCompassScanner } = await import("./compassScanner")

describe("useHieroglyphCompassScanner", () => {
  it("finds uncollected fragments on main path, side sections, and shop stock", () => {
    hasFragmentImpl = () => false
    compassLevelImpl = 1
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    // h1 appears three times: mainEndReward (0), sideSections[0].endReward (1), and a section's
    // rewards[] (2). The compass points at all uncollected pieces.
    expect(results.map(r => r.pieceIndex).sort()).toEqual([0, 1, 2])
    expect(results[0]).toMatchObject({ journeyId: "starter_1", hieroglyphId: "h1" })
  })

  it("excludes already-collected fragments — including one bought at a shop", () => {
    // Own the shop-stock piece (2): buying it drops it from the compass.
    hasFragmentImpl = (id, idx) => id === "h1" && idx === 2
    compassLevelImpl = 1
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    expect(results.map(r => r.pieceIndex).sort()).toEqual([0, 1])
  })

  it("returns [] when target not present in world", () => {
    hasFragmentImpl = () => false
    compassLevelImpl = 1
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    expect(result.current("nonexistent")).toHaveLength(0)
  })

  it("omits the exact cell below level 3 (floor precision — no assembly)", () => {
    hasFragmentImpl = () => false
    compassLevelImpl = 2
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    expect(results.every(r => r.cell === undefined)).toBe(true)
  })

  it("resolves the exact cell at level 3 by assembling the floor", () => {
    // Piece 2 lives in a rewards[] with no puzzle room to host it (an artificial stub the assembler
    // can't place); own it so the L3 assertion covers only the reliably-placed path pieces (0, 1).
    hasFragmentImpl = (id, idx) => id === "h1" && idx === 2
    compassLevelImpl = 3
    const { result } = renderHook(() => useHieroglyphCompassScanner())
    const results = result.current("h1")
    expect(results.map(r => r.pieceIndex).sort()).toEqual([0, 1])
    for (const r of results) {
      expect(r.cell).toBeDefined()
      expect(Number.isInteger(r.cell!.row)).toBe(true)
      expect(Number.isInteger(r.cell!.col)).toBe(true)
    }
  })
})
