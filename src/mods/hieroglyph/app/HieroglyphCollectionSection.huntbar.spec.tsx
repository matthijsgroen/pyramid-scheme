import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { type FC, useState } from "react"
import { allItems } from "@/data/inventory"
import type { CollectionSectionProps } from "@/app/pages/collectionSectionRegistry"

afterEach(cleanup)

// Identity i18n — the hunt affordance renders its keys ("detector.huntAction"/"detector.huntHint").
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const setCompassTarget = vi.fn()
let compassLevel = 0
let compassTarget: string | null = null
let found = 0
let fragments: Record<string, number> = {}
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({
    compassLevel,
    compassTarget,
    setCompassTarget,
    hieroglyphProgress: () => ({ found, required: 3 }),
    hieroglyphFragments: fragments,
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

// The cases above inject `selectedItem` as a prop, which proves HuntBar works in isolation but
// bypasses the grid entirely — so they stayed green while the only click path into that prop was
// dead (CollectibleSlot forwarded onClick for collected slots only, and HuntBar only offers
// UNcollected ones). This drives the real path: tap a partial tile in the grid, and the hunt
// affordance must appear. Mirrors Collection.tsx, which owns selectedItem as state and feeds it back.
const CollectionHarness: FC = () => {
  const [selectedItem, setSelectedItem] = useState<CollectionSectionProps["selectedItem"]>(null)
  return <HieroglyphCollectionSection selectedItem={selectedItem} onSelect={setSelectedItem} />
}

describe("picking a hunt target from the Collection grid", () => {
  it("offers to hunt a partially-collected hieroglyph after tapping its tile", () => {
    compassLevel = 1
    compassTarget = null
    found = 2 // 2/3 — partially collected, so the tile renders in the "partial" state
    fragments = { [hieroglyph.id]: 2 }
    setCompassTarget.mockClear()

    render(<CollectionHarness />)
    // Nothing selected yet, so only the "pick a target" hint shows.
    expect(screen.queryByText("detector.huntAction")).toBeNull()
    expect(screen.getByText("detector.huntHint")).toBeTruthy()

    fireEvent.click(screen.getByText(hieroglyph.symbol))

    const hunt = screen.getByText("detector.huntAction")
    fireEvent.click(hunt)
    expect(setCompassTarget).toHaveBeenCalledWith(hieroglyph.id)
  })
})
