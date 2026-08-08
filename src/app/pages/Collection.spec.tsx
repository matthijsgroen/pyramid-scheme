import { render, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CollectionItem, CollectionSectionProps } from "./collectionSectionRegistry"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// An empty inventory: everything this player has collected lives elsewhere — a finished hieroglyph
// is fragments, a tomb treasure is a held key. That used to hide the detail panel entirely.
vi.mock("@/app/Inventory/useInventory", () => ({
  useInventory: () => ({ inventory: {}, addItem: () => {} }),
}))

const treasure: CollectionItem = {
  id: "t2",
  symbol: "𓅱",
  name: "Papyrus Scroll",
  description: "A merchant's record scroll.",
  effectDescription: "Fragment compass (Lv 1)",
}

vi.mock("./collectionSectionRegistry", async importOriginal => {
  const actual = await importOriginal<typeof import("./collectionSectionRegistry")>()
  const Section = ({ onSelect }: CollectionSectionProps) => (
    <button onClick={() => onSelect(treasure)}>collected treasure</button>
  )
  return { ...actual, collectionSections: () => [{ id: "test", Component: Section }] }
})

const { CollectionPage } = await import("./Collection")

describe(CollectionPage, () => {
  it("shows a tapped item's details even when the player holds no inventory items", () => {
    const { getByText, queryByText } = render(<CollectionPage />)
    expect(queryByText("collection.clickForDetails")).not.toBeNull()

    fireEvent.click(getByText("collected treasure"))

    expect(queryByText(treasure.name)).not.toBeNull()
    expect(queryByText(treasure.description)).not.toBeNull()
    expect(queryByText(treasure.effectDescription!)).not.toBeNull()
  })
})
