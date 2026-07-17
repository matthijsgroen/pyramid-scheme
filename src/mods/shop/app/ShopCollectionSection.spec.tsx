import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { ALL_SELLABLES } from "@/data/sellables"

afterEach(cleanup)

// Identity i18n (never initialized in tests) — the junk category title renders as its key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Controlled inventory so the test drives the hide-until-first-collected condition.
let inventory: Record<string, number | undefined> = {}
vi.mock("@/app/Inventory/useInventory", () => ({
  useInventory: () => ({ inventory }),
}))

const { ShopCollectionSection } = await import("./ShopCollectionSection")

const JUNK_TITLE = "collection.categories.junk"

describe("ShopCollectionSection hide-until-collected", () => {
  it("renders nothing when no sellable is owned", () => {
    inventory = {}
    render(<ShopCollectionSection selectedItem={null} onSelect={() => {}} />)
    expect(screen.queryByText(JUNK_TITLE)).toBeNull()
  })

  it("renders the junk category once at least one sellable is owned", () => {
    inventory = { [ALL_SELLABLES[0].id]: 1 }
    render(<ShopCollectionSection selectedItem={null} onSelect={() => {}} />)
    expect(screen.getByText(JUNK_TITLE)).toBeTruthy()
  })

  // Regression: the detail panel's HieroglyphTile throws without a difficulty (sellables aren't
  // hieroglyphs, so it can't derive one from the id) — clicking a junk item blacked out the screen.
  it("emits a difficulty on select so the detail panel can render", () => {
    const item = ALL_SELLABLES[0]
    inventory = { [item.id]: 1 }
    const onSelect = vi.fn()
    render(<ShopCollectionSection selectedItem={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByText(item.symbol))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: item.id, symbol: item.symbol, difficulty: expect.any(String) })
    )
  })
})
