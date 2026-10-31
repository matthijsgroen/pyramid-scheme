// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { markedItemCounts } from "@/app/pages/collectionTabContract"
import { clearGameData, writeGameData } from "@/support/useGameStorage"
import { HIEROGLYPH_SYMBOLS } from "./hieroglyphSymbols"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const [held, partial] = Object.keys(HIEROGLYPH_SYMBOLS)
vi.mock("./useHieroglyphProgress", () => ({
  useHieroglyphProgress: () => ({
    compassLevel: 0,
    compassTarget: null,
    setCompassTarget: () => {},
    hieroglyphFragments: { [partial]: 1 },
    hieroglyphProgress: () => ({ found: 1, required: 3 }),
    loaded: true,
  }),
}))

const { HieroglyphCollectionSection } = await import("./HieroglyphCollectionSection")
const { useHieroglyphTab } = await import("./collectionTab")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("hieroglyph tab and section", () => {
  it("marks exactly the hieroglyphs the tab lists, not the one only partly found", async () => {
    await writeGameData({ "inventory-v2": { [held]: 1 } })

    const counts = await markedItemCounts(useHieroglyphTab, HieroglyphCollectionSection)

    expect(counts.ids).toEqual([held])
    expect(counts.allNew).toBe(1)
    expect(counts.eachNew).toEqual({ [held]: 1 })
  })
})
