import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { allItems } from "@/data/inventory"

afterEach(cleanup)

// Identity i18n — the hunt affordance renders its keys ("detector.huntAction"/"detector.huntHint").
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const setCompassTarget = vi.fn()
let compassLevel = 0
let compassTarget: string | null = null
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({
    compassLevel,
    compassTarget,
    setCompassTarget,
    hieroglyphProgress: () => ({ found: 0, required: 3 }),
    hieroglyphFragments: {},
  }),
}))
vi.mock("@/app/Inventory/useInventory", () => ({
  useInventory: () => ({ inventory: {} }),
}))

const { HieroglyphCollectionSection } = await import("./HieroglyphCollectionSection")

const hieroglyph = allItems[0] // a real hieroglyph the mod owns
const selected = { id: hieroglyph.id, symbol: hieroglyph.symbol, name: "", description: "" }

describe("hieroglyph hunt bar (compass target picker)", () => {
  it("is absent when the compass is not unlocked", () => {
    compassLevel = 0
    compassTarget = null
    render(<HieroglyphCollectionSection selectedItem={selected} onSelect={() => {}} />)
    expect(screen.queryByText("detector.huntAction")).toBeNull()
    expect(screen.queryByText("detector.huntHint")).toBeNull()
  })

  it("offers to hunt an uncollected hieroglyph and sets it as the target on click", () => {
    compassLevel = 1
    compassTarget = null
    setCompassTarget.mockClear()
    render(<HieroglyphCollectionSection selectedItem={selected} onSelect={() => {}} />)
    const hunt = screen.getByText("detector.huntAction")
    fireEvent.click(hunt)
    expect(setCompassTarget).toHaveBeenCalledWith(hieroglyph.id)
  })
})
